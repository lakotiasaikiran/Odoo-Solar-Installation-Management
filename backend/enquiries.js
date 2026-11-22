import {current,saveQuote} from './solarfit-routes.js';
import {createHmac} from 'node:crypto';
import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const limits = { customerName: [1, 120], phone: [7, 24], address: [3, 500], requirement: [3, 2000] };

function intake(body) {
  if (!body || typeof body.idempotencyKey !== 'string' || !uuid.test(body.idempotencyKey)) return null;
  const submission = { idempotencyKey: body.idempotencyKey.toLowerCase() };
  for (const [field, [min, max]] of Object.entries(limits)) {
    if (typeof body[field] !== 'string') return null;
    const value = body[field].trim();
    if (value.length < min || value.length > max || value.includes('\0')) return null;
    submission[field] = value;
  }
  const digits = submission.phone.replace(/\D/g, '');
  if (!/^\+?[\d\s()-]+$/.test(submission.phone) || digits.length < 7 || digits.length > 15) return null;

  // Optional Sprint 1 fields with sensible validation
  submission.sourceChannel = ['web', 'call', 'whatsapp', 'walkin'].includes(body.sourceChannel) ? body.sourceChannel : 'web';
  submission.propertyType = ['residential', 'commercial'].includes(body.propertyType) ? body.propertyType : 'residential';
  submission.monthlyBill = typeof body.monthlyBill === 'number' && body.monthlyBill >= 0 ? body.monthlyBill : Number(body.monthlyBill) || 0;
  submission.roofSpace = typeof body.roofSpace === 'number' && body.roofSpace >= 0 ? body.roofSpace : Number(body.roofSpace) || 0;
  submission.subsidyRequested = body.subsidyRequested !== undefined ? Boolean(body.subsidyRequested) : true;
  submission.backupRequired = ['none', 'essential', 'full'].includes(body.backupRequired) ? body.backupRequired : 'essential';
  submission.budget = typeof body.budget === 'number' && body.budget >= 0 ? body.budget : Number(body.budget) || 0;
  submission.paymentMethod = ['cash', 'loan_emi', 'milestone'].includes(body.paymentMethod) ? body.paymentMethod : 'milestone';

  return submission;
}

export function enquiryRoutes({ pool, crm, salesId }) {
  if (!uuid.test(salesId ?? '')) throw new Error('Configure PHOTONIX_SALES_ID for the intake owner');
  return (app, authenticate) => {
    const router = Router();
    const trackingCode = ref => createHmac('sha256',process.env.JWT_SECRET).update('tracking:'+ref).digest('hex').slice(0,32).toUpperCase();
    const shortCode = ref => createHmac('sha256',process.env.JWT_SECRET).update('tracking-v2:'+ref).digest('hex').slice(0,16).toUpperCase();
    const limiter = rateLimit({ windowMs: 60_000, limit: 30, standardHeaders: 'draft-7', legacyHeaders: false });

    // Public / Assisted Enquiry Submission (Check 1)
    router.post('/', limiter, (req,res,next)=>req.get('authorization')?authenticate(req,res,next):next(), async (req,res,next)=>{
      try {
        const data=intake(req.body);
        if(!data)return res.status(400).json({error:'Check the enquiry details.'});
        const targetSalesId=req.actor?.role==='sales'?req.actor.id:salesId;
        const owner = await pool.query("SELECT id FROM photonix_auth.account WHERE id=$1 AND role='sales' AND state='active'", [targetSalesId]);
        if (!owner.rowCount) return res.status(503).json({ error: 'Sales intake is temporarily unavailable.' });

        const lead = await crm.createEnquiry({ ...data, salesId: targetSalesId, customerId: null });
        res.status(201).json({ reference: lead.reference, trackingCode: shortCode(lead.reference) });
      } catch (err) {
        next(err);
      }
    });

    // Public Customer Status Tracking (Check 1 & Customer Isolation)
    router.get('/track/:reference', limiter, async (req, res) => {
      const ref = String(req.params.reference || '').trim().toUpperCase();
      if (!/^PX-\d{6}$/.test(ref)) return res.status(400).json({ error: 'Invalid reference format (expected PX-000000)' });

      if (![shortCode(ref),trackingCode(ref)].includes(req.get('X-Tracking-Code'))) return res.sendStatus(404);
      const numId = parseInt(ref.slice(3), 10);
      try {
        const lead = await crm.getEnquiry({ id: numId });
        if (!lead || lead.reference !== ref) return res.status(404).json({ error: 'Enquiry reference not found' });

        // Return sanitized public customer progress data (no internal cost / margin leak)
        res.json({
          reference: lead.reference,
          customerName: lead.customerName,
          address: lead.address,
          requirement: lead.requirement,
          sourceChannel: lead.sourceChannel,
          propertyType: lead.propertyType,
          qualificationState: lead.qualificationState,
          preliminaryCapacityKw: lead.preliminaryCapacityKw,
          surveyStatus: lead.surveyStatus,
          quoteStatus: lead.quoteStatus,
          quoteAmount: ['sent','accepted'].includes(lead.quoteStatus) ? lead.quoteAmount : null,
          quoteDetails: ['sent','accepted'].includes(lead.quoteStatus) ? lead.quoteDetails : null
        });
      } catch {
        res.status(404).json({ error: 'Enquiry reference not found' });
      }
    });

    // --- PROTECTED STAFF ROUTES ---
    router.use(authenticate);

    // List active surveyors for assignment
    router.get('/surveyors/list', async (req, res) => {
      if (!['sales', 'manager', 'director', 'admin'].includes(req.actor.role)) return res.sendStatus(403);
      const { rows } = await pool.query("SELECT id, email, role FROM photonix_auth.account WHERE role='surveyor' AND state='active' ORDER BY email");
      res.json(rows);
    });

    // Role-scoped enquiry queue
    router.get('/', async (req, res, next) => {
      try {
        if (req.actor.role === 'sales') {
          res.json(await crm.listEnquiries({ salesId: req.actor.id, role: 'sales' }));
        } else if (req.actor.role === 'surveyor') {
          res.json(await crm.listEnquiries({ surveyorId: req.actor.id, role: 'surveyor' }));
        } else if (req.actor.role === 'technical_reviewer') {
          res.json(await crm.listEnquiries({ reviewerId: req.actor.id, role: 'technical_reviewer' }));
        } else if (['admin', 'manager', 'director'].includes(req.actor.role)) {
          res.json(await crm.listEnquiries({ role: req.actor.role }));
        } else {
          res.sendStatus(403);
        }
      } catch (err) {
        next(err);
      }
    });

    // Get single enquiry by ID
    router.get('/:id', async (req, res, next) => {
      const id = Number(req.params.id);
      if (!Number.isSafeInteger(id) || id < 1) return res.sendStatus(404);
      try {
        let lead;
        if (req.actor.role === 'sales') {
          lead = await crm.getEnquiry({ id, salesId: req.actor.id });
        } else if (req.actor.role === 'surveyor') {
          lead = await crm.getEnquiry({ id, surveyorId: req.actor.id });
        } else if (['technical_reviewer', 'admin', 'manager', 'director'].includes(req.actor.role)) {
          lead = await crm.getEnquiry({ id, reviewerId: req.actor.id });
        } else {
          return res.sendStatus(403);
        }
        if (!lead) return res.sendStatus(404);
        res.json(lead);
      } catch (err) {
        next(err);
      }
    });

    // Acceptance Check 2: Record Qualification Call (Sales role or Management)
    router.post('/:id/qualify', async (req, res, next) => {
      if (!['sales', 'director', 'manager', 'admin'].includes(req.actor.role)) return res.sendStatus(403);
      const id = Number(req.params.id);
      if (!Number.isSafeInteger(id) || id < 1) return res.sendStatus(404);

      const { gridSuitability, monthlyBill, roofSpace, qualificationNotes, preliminaryCapacityKw, assignedSurveyorId, qualificationState } = req.body ?? {};
      if (!['suitable', 'unsuitable', 'voltage_unstable', 'upgrade_needed'].includes(gridSuitability)) {
        return res.status(400).json({ error: 'Valid grid suitability is required (suitable, unsuitable, voltage_unstable, upgrade_needed).' });
      }

      try {
        const lead = await crm.qualifyEnquiry({
          id,
          salesId: req.actor.role === 'sales' ? req.actor.id : salesId,
          gridSuitability,
          monthlyBill: Number(monthlyBill) || 0,
          roofSpace: Number(roofSpace) || 0,
          qualificationNotes: typeof qualificationNotes === 'string' ? qualificationNotes.trim() : '',
          preliminaryCapacityKw: Number(preliminaryCapacityKw) || 0,
          assignedSurveyorId: assignedSurveyorId ? String(assignedSurveyorId) : null,
          qualificationState: qualificationState === 'unsuitable' ? 'unsuitable' : 'qualified'
        });
        res.json(lead);
      } catch (err) {
        next(err);
      }
    });

    // Acceptance Check 3: Record Technician Survey Findings (Surveyor role or Management)
    router.post('/:id/survey', async (req, res, next) => {
      if (!['surveyor', 'director', 'admin'].includes(req.actor.role)) return res.sendStatus(403);
      const id = Number(req.params.id);
      if (!Number.isSafeInteger(id) || id < 1) return res.sendStatus(404);

      const { roofDirection, roofTiltDeg, usableRoofArea, cableDistanceM, roofType, surveyNotes } = req.body ?? {};
      if (!['south', 'south_west', 'south_east', 'east', 'west', 'north'].includes(roofDirection)) {
        return res.status(400).json({ error: 'Roof direction is required (south, south_west, south_east, east, west, north).' });
      }
      const tilt = Number(roofTiltDeg);
      const area = Number(usableRoofArea);
      const cable = Number(cableDistanceM);
      if (isNaN(tilt) || tilt < 0 || tilt > 90) return res.status(400).json({ error: 'Roof tilt must be between 0 and 90 degrees.' });
      if (isNaN(area) || area <= 0) return res.status(400).json({ error: 'Usable roof area must be greater than 0 sq ft.' });
      if (isNaN(cable) || cable <= 0) return res.status(400).json({ error: 'Cable distance must be greater than 0 meters.' });

      try {
        const lead = await crm.submitSurvey({
          id,
          surveyorId: req.actor.id,
          roofDirection,
          roofTiltDeg: tilt,
          usableRoofArea: area,
          cableDistanceM: cable,
          roofType: ['rcc_flat', 'tin_shed', 'tiled_pitched', 'asbestos', 'other'].includes(roofType) ? roofType : 'rcc_flat',
          surveyNotes: typeof surveyNotes === 'string' ? surveyNotes.trim() : ''
        });
        res.json(lead);
      } catch (err) {
        next(err);
      }
    });

    // Acceptance Check 4: Technical Reviewer Decision (Approve or Return)
    router.post('/:id/review', async (req, res, next) => {
      if (!['technical_reviewer', 'director', 'admin'].includes(req.actor.role)) return res.sendStatus(403);
      const id = Number(req.params.id);
      if (!Number.isSafeInteger(id) || id < 1) return res.sendStatus(404);

      const { decision, reviewNotes } = req.body ?? {};
      if (!['approve', 'return'].includes(decision)) {
        return res.status(400).json({ error: "Review decision must be 'approve' or 'return'." });
      }
      if (decision === 'return' && (!reviewNotes || !reviewNotes.trim())) {
        return res.status(400).json({ error: 'Returning a survey for correction requires detailed review notes.' });
      }

      try {
        const lead = await crm.reviewSurvey({
          id,
          reviewerId: req.actor.id,
          decision,
          reviewNotes: typeof reviewNotes === 'string' ? reviewNotes.trim() : ''
        });
        res.json(lead);
      } catch (err) {
        next(err);
      }
    });

    // Acceptance Check 4: Quotation Gate (Allow quote only after survey approval)
    router.post('/:id/quote', async (req, res, next) => {
      if (!['sales', 'director', 'manager', 'admin'].includes(req.actor.role)) return res.sendStatus(403);
      const id = Number(req.params.id);
      if (!Number.isSafeInteger(id) || id < 1) return res.sendStatus(404);

      try {
        // Enforce gate: verify survey status first!
        const existing = await crm.getEnquiry({
          id,
          salesId: req.actor.role === 'sales' ? req.actor.id : undefined,
          reviewerId: req.actor.role === 'sales' ? undefined : req.actor.id
        });
        if (!existing) return res.sendStatus(404);
        if (existing.surveyStatus !== 'approved') {
          return res.status(403).json({
            error: 'Final quote creation is locked: technical survey must be approved first.',
            surveyStatus: existing.surveyStatus
          });
        }

        const {survey,catalog,options}=await current(pool,existing);
        const kw=existing.preliminaryCapacityKw;
        const selected=options.find(o=>o.kw===kw) ?? options.slice().sort((a,b)=>b.kw-a.kw)[0];
        if(!selected || selected.requiresMarginReview)return res.status(409).json({error:'No suitable package cleared for issue. Review size, costs and margin.'});
        const quote=await saveQuote(pool,id,req.actor.id,survey.revision,selected,catalog.assumptions);
        const quoteDetails={quoteId:quote.id,packageId:selected.packageId,capacityKw:selected.kw,
          panelCount:selected.lines.filter(l=>String(l.productId).includes('panel')).reduce((n,l)=>n+l.qty,0),
          grossPrice:selected.grossPaise/100,estimatedSubsidy:selected.estimatedSubsidyPaise/100,netEffectiveCost:selected.effectivePaise/100,
          source:catalog.assumptions.source,parts:selected.lines.map(l=>({productId:l.productId,qty:l.qty}))};
        const net=quoteDetails.netEffectiveCost;
        const updated = await crm.generateQuote({
          id,
          salesId: req.actor.role === 'sales' ? req.actor.id : salesId,
          quoteAmount: net,
          quoteDetails
        });
        res.json({ message: 'Quotation generated and sent to customer', quote: updated });
      } catch (err) {
        next(err);
      }
    });

    // Error handling
    router.use((err, _req, res, _next) => {
      console.error('API Error:', err);
      if (err.status === 409) return res.status(409).json({ error: 'This submission reference already belongs to different details.' });
      if (err.status === 403) return res.status(403).json({ error: err.message || 'Action forbidden' });
      if (err.status === 400) return res.status(400).json({ error: err.message || 'Invalid request' });
      res.status(503).json({ error: 'Enquiry service unavailable. Retry with the same submission reference.' });
    });

    app.use('/api/enquiries', router);
  };
}
