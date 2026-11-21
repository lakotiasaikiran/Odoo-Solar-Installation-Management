from odoo import fields, models


class PhotonixSalesUser(models.Model):
    _inherit = 'res.users'

    photonix_staff_id = fields.Char(index=True, copy=False, groups='base.group_system')
    _photonix_staff_unique = models.Constraint('UNIQUE(photonix_staff_id)', 'A Photonix identity already has a salesperson.')


class PhotonixLead(models.Model):
    _inherit = 'crm.lead'

    photonix_request_id = fields.Char(index=True, copy=False, readonly=True)
    photonix_payload_hash = fields.Char(copy=False, readonly=True)
    photonix_customer_id = fields.Char(index=True, copy=False, readonly=True)
    photonix_requirement = fields.Text(copy=False)
    _photonix_request_unique = models.Constraint('UNIQUE(photonix_request_id)', 'The enquiry has already been submitted.')

    # Sprint 1 - Channels and Intake details
    source_channel = fields.Selection([
        ('web', 'Web Form'), ('call', 'Phone Call'), ('whatsapp', 'WhatsApp'), ('walkin', 'Walk-in')
    ], default='web', copy=False)
    property_type = fields.Selection([
        ('residential', 'Residential'), ('commercial', 'Commercial')
    ], default='residential', copy=False)
    monthly_bill = fields.Float(string='Monthly Electricity Bill (INR)', default=0.0, copy=False)
    roof_space = fields.Float(string='Available Roof Space (sq ft)', default=0.0, copy=False)
    subsidy_requested = fields.Boolean(string='Subsidy Requested', default=True, copy=False)
    backup_required = fields.Selection([
        ('none', 'No Backup'), ('essential', 'Essential Load'), ('full', 'Full Backup')
    ], default='essential', copy=False)
    budget = fields.Float(string='Customer Budget (INR)', default=0.0, copy=False)
    payment_method = fields.Selection([
        ('cash', 'Direct Payment'), ('loan_emi', 'Bank EMI / Loan'), ('milestone', 'Milestone Installments')
    ], default='milestone', copy=False)

    # Acceptance Check 2: Qualification Call
    qualification_state = fields.Selection([
        ('new', 'New Enquiry'), ('qualified', 'Qualified'), ('unsuitable', 'Unsuitable')
    ], default='new', copy=False)
    grid_suitability = fields.Selection([
        ('suitable', 'Grid Suitable'), ('unsuitable', 'Grid Unsuitable'),
        ('voltage_unstable', 'Voltage Fluctuation'), ('upgrade_needed', 'Requires Load Upgrade')
    ], copy=False)
    preliminary_capacity_kw = fields.Float(string='Preliminary Capacity (kW)', default=0.0, copy=False)
    qualification_notes = fields.Text(string='Qualification Notes', copy=False)
    qualified_at = fields.Datetime(string='Qualified At', copy=False)
    assigned_surveyor_id = fields.Char(string='Assigned Surveyor Staff ID', copy=False)

    # Acceptance Check 3: Physical Survey Findings
    survey_status = fields.Selection([
        ('unassigned', 'Not Assigned'), ('assigned', 'Survey Assigned'),
        ('submitted', 'Submitted for Review'), ('changes_requested', 'Changes Requested'),
        ('approved', 'Survey Approved')
    ], default='unassigned', copy=False)
    roof_direction = fields.Selection([
        ('south', 'South (Optimal)'), ('south_west', 'South-West'), ('south_east', 'South-East'),
        ('east', 'East'), ('west', 'West'), ('north', 'North (Sub-optimal)')
    ], copy=False)
    roof_tilt_deg = fields.Float(string='Roof Tilt (Degrees)', default=0.0, copy=False)
    usable_roof_area = fields.Float(string='Usable Roof Area (sq ft)', default=0.0, copy=False)
    cable_distance_m = fields.Float(string='Cable Distance to Inverter/Meter (m)', default=0.0, copy=False)
    roof_type = fields.Selection([
        ('rcc_flat', 'RCC Flat Roof'), ('tin_shed', 'Metal / Tin Shed'),
        ('tiled_pitched', 'Tiled Pitched Roof'), ('asbestos', 'Asbestos Sheet'), ('other', 'Other')
    ], copy=False)
    survey_notes = fields.Text(string='Surveyor Notes / Obstructions', copy=False)
    survey_submitted_at = fields.Datetime(string='Survey Submitted At', copy=False)

    # Acceptance Check 4: Technical Review and Quotation Gate
    technical_reviewer_id = fields.Char(string='Technical Reviewer Staff ID', copy=False)
    technical_review_notes = fields.Text(string='Technical Review Notes', copy=False)
    technical_reviewed_at = fields.Datetime(string='Technical Reviewed At', copy=False)

    quote_status = fields.Selection([
        ('locked', 'Locked (Survey Pending)'), ('draft', 'Draft Quote'), ('sent', 'Quote Sent to Customer')
    ], default='locked', copy=False)
    quote_amount = fields.Float(string='Quote Amount (INR)', default=0.0, copy=False)
    quote_details = fields.Text(string='Quotation JSON', copy=False)
    quote_created_at = fields.Datetime(string='Quote Created At', copy=False)
