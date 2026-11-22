import hashlib
import json
from uuid import UUID

from markupsafe import Markup, escape
from psycopg2.errors import UniqueViolation
from werkzeug.exceptions import BadRequest, Conflict, Forbidden

from odoo import fields, http
from odoo.http import request


def identifier(value):
    try:
        return str(UUID(str(value)))
    except (TypeError, ValueError) as exc:
        raise BadRequest('Invalid identifier') from exc


def text(value, limit):
    if not isinstance(value, str) or not value.strip() or len(value) > limit:
        raise BadRequest('Invalid enquiry details')
    return value.strip()


def service_env():
    env = request.env
    principal = env.ref('photonix_crm.service_identity', raise_if_not_found=False)
    if not principal or env.uid != principal.id or not request.httprequest.headers.get('Authorization', '').startswith('Bearer '):
        raise Forbidden()
    return env


def salesperson(env, staff_id):
    return env['res.users'].sudo().search([('photonix_staff_id', '=', identifier(staff_id)), ('share', '=', False)], limit=1)


def project(lead):
    return {
        'id': lead.id,
        'reference': f'PX-{lead.id:06d}',
        'customerName': lead.contact_name,
        'phone': lead.phone,
        'address': lead.street,
        'requirement': lead.photonix_requirement,
        'salesId': lead.user_id.sudo().photonix_staff_id,
        'customerId': lead.photonix_customer_id or None,
        # Sprint 1 fields
        'sourceChannel': lead.source_channel or 'web',
        'propertyType': lead.property_type or 'residential',
        'monthlyBill': lead.monthly_bill or 0.0,
        'roofSpace': lead.roof_space or 0.0,
        'subsidyRequested': bool(lead.subsidy_requested),
        'backupRequired': lead.backup_required or 'essential',
        'budget': lead.budget or 0.0,
        'paymentMethod': lead.payment_method or 'milestone',
        'qualificationState': lead.qualification_state or 'new',
        'gridSuitability': lead.grid_suitability or None,
        'preliminaryCapacityKw': lead.preliminary_capacity_kw or 0.0,
        'qualificationNotes': lead.qualification_notes or None,
        'assignedSurveyorId': lead.assigned_surveyor_id or None,
        'surveyStatus': lead.survey_status or 'unassigned',
        'roofDirection': lead.roof_direction or None,
        'roofTiltDeg': lead.roof_tilt_deg or 0.0,
        'usableRoofArea': lead.usable_roof_area or 0.0,
        'cableDistanceM': lead.cable_distance_m or 0.0,
        'roofType': lead.roof_type or None,
        'surveyNotes': lead.survey_notes or None,
        'surveySubmittedAt': lead.survey_submitted_at.isoformat() if lead.survey_submitted_at else None,
        'technicalReviewerId': lead.technical_reviewer_id or None,
        'technicalReviewNotes': lead.technical_review_notes or None,
        'technicalReviewedAt': lead.technical_reviewed_at.isoformat() if lead.technical_reviewed_at else None,
        'quoteStatus': lead.quote_status or 'locked',
        'quoteAmount': lead.quote_amount or 0.0,
        'quoteDetails': json.loads(lead.quote_details) if lead.quote_details else None,
        'quoteCreatedAt': lead.quote_created_at.isoformat() if lead.quote_created_at else None,
    }


class PhotonixIntake(http.Controller):
    options = dict(type='json2', auth='bearer', bearer_scope='photonix_intake', methods=['POST'], save_session=False)

    @http.route('/photonix/v1/enquiries/submit', **options)
    def submit(self, idempotencyKey, customerId, salesId, customerName, phone, address, requirement, **extra):
        env = service_env()
        key = identifier(idempotencyKey)
        owner = salesperson(env, salesId)
        if not owner:
            raise BadRequest('Unknown salesperson')
        customer = identifier(customerId) if customerId is not None else None
        name, number, site, needs = text(customerName, 180), text(phone, 50), text(address, 1000), text(requirement, 4000)
        
        # Consistent payload hash
        digest = hashlib.sha256(json.dumps([owner.id, customer, name, number, site, needs], ensure_ascii=False).encode()).hexdigest()
        leads = env['crm.lead'].with_user(owner).with_context(tracking_disable=True)
        existing = leads.search([('photonix_request_id', '=', key)], limit=1)
        if existing:
            if existing.photonix_payload_hash != digest:
                raise Conflict('The request key is already assigned')
            return project(existing)

        vals = {
            'name': f'Rooftop solar enquiry - {name}', 'contact_name': name, 'street': site,
            'phone': number, 'description': Markup('<p>%s</p>') % escape(needs), 'type': 'lead',
            'user_id': owner.id, 'photonix_request_id': key, 'photonix_customer_id': customer,
            'photonix_payload_hash': digest, 'photonix_requirement': needs,
            'source_channel': extra.get('sourceChannel') if extra.get('sourceChannel') in ('web', 'call', 'whatsapp', 'walkin') else 'web',
            'property_type': extra.get('propertyType') if extra.get('propertyType') in ('residential', 'commercial') else 'residential',
            'monthly_bill': float(extra.get('monthlyBill') or 0.0),
            'roof_space': float(extra.get('roofSpace') or 0.0),
            'subsidy_requested': bool(extra.get('subsidyRequested', True)),
            'backup_required': extra.get('backupRequired') if extra.get('backupRequired') in ('none', 'essential', 'full') else 'essential',
            'budget': float(extra.get('budget') or 0.0),
            'payment_method': extra.get('paymentMethod') if extra.get('paymentMethod') in ('cash', 'loan_emi', 'milestone') else 'milestone',
        }
        try:
            with env.cr.savepoint():
                lead = leads.create(vals)
        except UniqueViolation as exc:
            if exc.diag.constraint_name != 'crm_lead_photonix_request_unique':
                raise
            return {'retryCommittedKey': True}
        return project(lead)

    @http.route('/photonix/v1/enquiries/list', **options)
    def list_enquiries(self, salesId=None, surveyorId=None, reviewerId=None, role=None):
        env = service_env()
        domain = [('photonix_request_id', '!=', False)]
        if role == 'surveyor' or surveyorId:
            # Surveyor sees assigned leads
            leads = env['crm.lead'].sudo().search(domain + [('assigned_surveyor_id', '=', identifier(surveyorId))], order='id DESC')
        elif role == 'technical_reviewer' or reviewerId:
            # Reviewer sees submitted, changes_requested or approved surveys
            leads = env['crm.lead'].sudo().search(domain + [('survey_status', 'in', ['submitted', 'changes_requested', 'approved'])], order='id DESC')
        elif salesId:
            owner = salesperson(env, salesId)
            if not owner:
                return []
            leads = env['crm.lead'].with_user(owner).search(domain + [('user_id', '=', owner.id)], order='id DESC')
        else:
            leads = env['crm.lead'].sudo().search(domain, order='id DESC')
        return [project(lead) for lead in leads]

    @http.route('/photonix/v1/enquiries/get', **options)
    def get_enquiry(self, id, salesId=None, customerId=None, surveyorId=None, reviewerId=None):
        env = service_env()
        if type(id) is not int or id <= 0:
            raise BadRequest('Valid id is required')
        domain = [('id', '=', id), ('photonix_request_id', '!=', False)]
        if salesId:
            owner = salesperson(env, salesId)
            if not owner:
                return None
            lead = env['crm.lead'].with_user(owner).search(domain + [('user_id', '=', owner.id)], limit=1)
        elif surveyorId:
            lead = env['crm.lead'].sudo().search(domain + [('assigned_surveyor_id', '=', identifier(surveyorId))], limit=1)
        elif reviewerId:
            lead = env['crm.lead'].sudo().search(domain, limit=1)
        elif customerId:
            lead = env['crm.lead'].sudo().search(domain + [('photonix_customer_id', '=', identifier(customerId))], limit=1)
        else:
            lead = env['crm.lead'].sudo().search(domain, limit=1)
        return project(lead) if lead else None

    @http.route('/photonix/v1/enquiries/qualify', **options)
    def qualify(self, id, salesId=None, gridSuitability=None, monthlyBill=0, roofSpace=0, qualificationNotes=None, preliminaryCapacityKw=0, assignedSurveyorId=None, qualificationState='qualified'):
        env = service_env()
        lead = env['crm.lead'].sudo().search([('id', '=', id)], limit=1)
        if not lead:
            raise BadRequest('Enquiry not found')
        
        surveyor = identifier(assignedSurveyorId) if assignedSurveyorId else None
        lead.sudo().write({
            'qualification_state': qualificationState if qualificationState in ('qualified', 'unsuitable') else 'qualified',
            'grid_suitability': gridSuitability,
            'monthly_bill': float(monthlyBill or lead.monthly_bill),
            'roof_space': float(roofSpace or lead.roof_space),
            'qualification_notes': text(qualificationNotes, 2000) if qualificationNotes else '',
            'preliminary_capacity_kw': float(preliminaryCapacityKw or 0.0),
            'assigned_surveyor_id': surveyor,
            'survey_status': 'assigned' if (qualificationState == 'qualified' and surveyor) else lead.survey_status,
            'qualified_at': fields.Datetime.now(),
        })
        return project(lead)

    @http.route('/photonix/v1/enquiries/submit_survey', **options)
    def submit_survey(self, id, surveyorId=None, roofDirection=None, roofTiltDeg=0, usableRoofArea=0, cableDistanceM=0, roofType=None, surveyNotes=None):
        env = service_env()
        lead = env['crm.lead'].sudo().search([('id', '=', id)], limit=1)
        if not lead:
            raise BadRequest('Enquiry not found')
        
        lead.write({
            'survey_status': 'submitted',
            'roof_direction': roofDirection,
            'roof_tilt_deg': float(roofTiltDeg),
            'usable_roof_area': float(usableRoofArea),
            'cable_distance_m': float(cableDistanceM),
            'roof_type': roofType or 'rcc_flat',
            'survey_notes': text(surveyNotes, 2000) if surveyNotes else '',
            'survey_submitted_at': fields.Datetime.now(),
        })
        return project(lead)

    @http.route('/photonix/v1/enquiries/review_survey', **options)
    def review_survey(self, id, reviewerId, decision, reviewNotes=None):
        env = service_env()
        rid = identifier(reviewerId)
        lead = env['crm.lead'].sudo().search([('id', '=', id)], limit=1)
        if not lead:
            raise BadRequest('Enquiry not found')
        if decision not in ('approve', 'return'):
            raise BadRequest('Invalid review decision')
        
        if decision == 'approve':
            lead.write({
                'survey_status': 'approved',
                'quote_status': 'draft',  # Unlocks quotation gate!
                'technical_reviewer_id': rid,
                'technical_review_notes': text(reviewNotes, 2000) if reviewNotes else 'Survey findings verified and approved.',
                'technical_reviewed_at': fields.Datetime.now(),
            })
        else:
            if not reviewNotes or not reviewNotes.strip():
                raise BadRequest('Return requires correction notes')
            lead.write({
                'survey_status': 'changes_requested',
                'quote_status': 'locked',
                'technical_reviewer_id': rid,
                'technical_review_notes': text(reviewNotes, 2000),
                'technical_reviewed_at': fields.Datetime.now(),
            })
        return project(lead)

    @http.route('/photonix/v1/enquiries/generate_quote', **options)
    def generate_quote(self, id, salesId=None, quoteAmount=0.0, quoteDetails=None):
        env = service_env()
        lead = env['crm.lead'].sudo().search([('id', '=', id)], limit=1)
        if not lead:
            raise BadRequest('Enquiry not found')
        
        # Check 4: Allow a quote to be sent to the customer ONLY after survey approval!
        if lead.survey_status != 'approved':
            raise Forbidden('Final quote creation is locked: technical survey must be approved first.')
        
        lead.sudo().write({
            'quote_status': 'sent',
            'quote_amount': float(quoteAmount),
            'quote_details': json.dumps(quoteDetails or {}),
            'quote_created_at': fields.Datetime.now(),
        })
        return project(lead)
