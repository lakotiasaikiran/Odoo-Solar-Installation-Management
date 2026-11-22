import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';

const CUSTOMER_AUDIENCE = 'photonix-customer';
const ISSUER = 'photonix';

export function normalizePhone(raw) {
  if (!raw) return '';
  const digits = String(raw).replace(/\D/g, '');
  return digits.length >= 10 ? digits.slice(-10) : digits;
}

export function customerRoutes({ pool, crm }) {
  const router = Router();
  const secret = process.env.JWT_SECRET;
  if (!secret || Buffer.byteLength(secret) < 32) {
    throw new Error('Configure a random JWT_SECRET of at least 32 bytes');
  }

  // Auto-ensure demo customers on startup
  async function initSchema() {
    try {
      // Pre-seed demo customers if none exist
      const { rows } = await pool.query('SELECT count(*) as cnt FROM photonix_auth.customer');
      if (Number(rows[0]?.cnt || 0) === 0) {
        const hash = await bcrypt.hash('Photonix@123', 10);
        const demoCustomers = [
          { phone: '9876543210', name: 'Aarav Sharma', email: 'aarav.sharma@example.com' },
          { phone: '9123456780', name: 'Pooja Patel', email: 'pooja.patel@example.com' },
          { phone: '9823012345', name: 'Rajesh Kumar', email: 'rajesh.kumar@example.com' }
        ];
        for (const c of demoCustomers) {
          await pool.query(
            `INSERT INTO photonix_auth.customer (id, phone, name, email, password_hash)
             VALUES ($1, $2, $3, $4, $5) ON CONFLICT (phone) DO NOTHING`,
            [randomUUID(), c.phone, c.name, c.email, hash]
          );
        }
      }
    } catch (err) {
      console.warn('Customer schema notice:', err.message);
    }
  }
  initSchema();

  // Authentication Middleware for Customer Requests
  function authenticateCustomer(req, res, next) {
    const auth = req.get('authorization') || '';
    const token = /^Bearer (\S+)$/.exec(auth)?.[1];
    if (!token) {
      return res.status(401).json({ error: 'Customer authentication token required' });
    }
    try {
      const payload = jwt.verify(token, secret, {
        issuer: ISSUER,
        audience: CUSTOMER_AUDIENCE,
        algorithms: ['HS256']
      });
      if (payload.role !== 'customer') {
        return res.status(403).json({ error: 'Customer session required' });
      }
      req.customer = payload;
      next();
    } catch {
      return res.status(401).json({ error: 'Customer session expired or invalid' });
    }
  }

  // ─── PUBLIC CUSTOMER AUTHENTICATION ────────────────────────────────────────

  // Customer Self-Registration
  router.post('/register', async (req, res) => {
    const { name, phone, email, password } = req.body ?? {};
    const normPhone = normalizePhone(phone);
    if (!normPhone || normPhone.length !== 10) {
      return res.status(400).json({ error: 'Enter a valid 10-digit Indian mobile number.' });
    }
    if (typeof name !== 'string' || name.trim().length < 2) {
      return res.status(400).json({ error: 'Enter your full name.' });
    }
    if (typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    try {
      const { rows: [existing] } = await pool.query(
        'SELECT id FROM photonix_auth.customer WHERE phone = $1',
        [normPhone]
      );
      if (existing) {
        return res.status(409).json({ error: 'An account with this mobile number already exists. Please sign in.' });
      }

      const id = randomUUID();
      const hash = await bcrypt.hash(password, 10);
      await pool.query(
        `INSERT INTO photonix_auth.customer (id, phone, name, email, password_hash)
         VALUES ($1, $2, $3, $4, $5)`,
        [id, normPhone, name.trim(), email?.trim() || null, hash]
      );

      const token = jwt.sign(
        { sub: id, role: 'customer', phone: normPhone, name: name.trim(), email: email?.trim() || null },
        secret,
        { issuer: ISSUER, audience: CUSTOMER_AUDIENCE, algorithm: 'HS256', expiresIn: '7d' }
      );

      res.status(201).json({
        token,
        customer: { id, phone: normPhone, name: name.trim(), email: email?.trim() || null }
      });
    } catch (err) {
      console.error('Customer registration error:', err);
      res.status(500).json({ error: 'Registration failed. Please try again.' });
    }
  });

  // Customer Sign In (by Phone + Password OR Phone + Enquiry Reference)
  router.post('/login', async (req, res) => {
    const { phone, password, reference } = req.body ?? {};
    const normPhone = normalizePhone(phone);
    if (!normPhone || normPhone.length !== 10) {
      return res.status(400).json({ error: 'Enter a valid 10-digit mobile number.' });
    }

    try {
      // 1. Direct Reference Validation (e.g. PX-000001 or PX-000020)
      if (typeof reference === 'string' && reference.trim()) {
        const ref = reference.trim().toUpperCase();
        let leads = [];
        try {
          leads = await crm.listEnquiries({});
        } catch {}
        const lead = leads.find(l => l.reference === ref);
        if (!lead || normalizePhone(lead.phone) !== normPhone) {
          return res.status(401).json({ error: 'Enquiry reference and mobile number do not match.' });
        }

        // Fetch or create customer record
        let { rows: [customer] } = await pool.query(
          'SELECT id, phone, name, email FROM photonix_auth.customer WHERE phone = $1',
          [normPhone]
        );
        if (!customer) {
          const newId = randomUUID();
          const demoHash = await bcrypt.hash('Photonix@123', 10);
          await pool.query(
            `INSERT INTO photonix_auth.customer (id, phone, name, email, password_hash)
             VALUES ($1, $2, $3, $4, $5) ON CONFLICT (phone) DO UPDATE SET last_login_at = now()`,
            [newId, normPhone, lead.customerName || 'Customer', null, demoHash]
          );
          customer = { id: newId, phone: normPhone, name: lead.customerName || 'Customer', email: null };
        }

        const token = jwt.sign(
          { sub: customer.id, role: 'customer', phone: normPhone, name: customer.name, email: customer.email },
          secret,
          { issuer: ISSUER, audience: CUSTOMER_AUDIENCE, algorithm: 'HS256', expiresIn: '7d' }
        );

        return res.json({ token, customer });
      }

      // 2. Password-based Login
      if (typeof password !== 'string' || !password) {
        return res.status(400).json({ error: 'Enter your password or your enquiry reference code.' });
      }

      let { rows: [customer] } = await pool.query(
        'SELECT id, phone, name, email, password_hash FROM photonix_auth.customer WHERE phone = $1',
        [normPhone]
      );

      // Demo fallback: if account not in customer table but password is standard demo password,
      // inspect CRM or jobs to auto-bootstrap customer session
      if (!customer && password === 'Photonix@123') {
        let leads = [];
        try { leads = await crm.listEnquiries({}); } catch {}
        const matchingLead = leads.find(l => normalizePhone(l.phone) === normPhone);
        const custName = matchingLead?.customerName || 'Aarav Sharma';
        const newId = randomUUID();
        const demoHash = await bcrypt.hash('Photonix@123', 10);
        await pool.query(
          `INSERT INTO photonix_auth.customer (id, phone, name, email, password_hash)
           VALUES ($1, $2, $3, $4, $5) ON CONFLICT (phone) DO NOTHING`,
          [newId, normPhone, custName, `${normPhone}@photonix.customer`, demoHash]
        );
        customer = {
          id: newId,
          phone: normPhone,
          name: custName,
          email: `${normPhone}@photonix.customer`,
          password_hash: demoHash
        };
      }

      if (!customer) {
        return res.status(401).json({ error: 'No customer account found with this phone number. Please register.' });
      }

      const valid = await bcrypt.compare(password, customer.password_hash);
      if (!valid) {
        return res.status(401).json({ error: 'Invalid password. Try again or use your enquiry reference.' });
      }

      await pool.query('UPDATE photonix_auth.customer SET last_login_at = now() WHERE id = $1', [customer.id]);

      const token = jwt.sign(
        { sub: customer.id, role: 'customer', phone: normPhone, name: customer.name, email: customer.email },
        secret,
        { issuer: ISSUER, audience: CUSTOMER_AUDIENCE, algorithm: 'HS256', expiresIn: '7d' }
      );

      res.json({
        token,
        customer: { id: customer.id, phone: normPhone, name: customer.name, email: customer.email }
      });
    } catch (err) {
      console.error('Customer login error:', err);
      res.status(500).json({ error: 'Sign in failed. Please try again.' });
    }
  });

  // Demo Customers List for one-click testing
  router.get('/demo-customers', async (_req, res) => {
    try {
      let leads = [];
      try { leads = await crm.listEnquiries({}); } catch {}

      const demoList = [
        {
          name: 'Aarav Sharma',
          phone: '9876543210',
          reference: leads.find(l => normalizePhone(l.phone) === '9876543210')?.reference || 'PX-000001',
          capacityKw: 3.0,
          quoteStatus: leads.find(l => normalizePhone(l.phone) === '9876543210')?.quoteStatus || 'sent',
          note: 'Residential 3 kW — Approved Quotation ready for Invoicing'
        },
        {
          name: 'Pooja Patel',
          phone: '9123456780',
          reference: leads.find(l => normalizePhone(l.phone) === '9123456780')?.reference || 'PX-000002',
          capacityKw: 5.0,
          quoteStatus: leads.find(l => normalizePhone(l.phone) === '9123456780')?.quoteStatus || 'sent',
          note: 'Residential 5 kW — Bungalow Terrace'
        },
        {
          name: 'Rajesh Kumar',
          phone: '9823012345',
          reference: 'PX-000003',
          capacityKw: 4.0,
          quoteStatus: 'sent',
          note: 'Residential 4 kW — Ready to Book'
        }
      ];
      res.json(demoList);
    } catch {
      res.status(500).json({ error: 'Failed to retrieve demo customers' });
    }
  });

  // ─── PROTECTED CUSTOMER PORTAL ROUTES ──────────────────────────────────────

  // 1. Current Customer Profile
  router.get('/me', authenticateCustomer, async (req, res) => {
    try {
      const { rows: [cust] } = await pool.query(
        'SELECT id, phone, name, email, created_at, last_login_at FROM photonix_auth.customer WHERE phone = $1',
        [req.customer.phone]
      );
      res.json(cust || req.customer);
    } catch (err) {
      res.status(500).json({ error: 'Could not fetch customer profile' });
    }
  });

  // 2. Customer Projects & Enquiries (Strictly scoped to logged in phone)
  router.get('/projects', authenticateCustomer, async (req, res) => {
    try {
      const normCustomerPhone = req.customer.phone;
      let leads = [];
      try {
        leads = await crm.listEnquiries({});
      } catch (e) {
        console.warn('CRM listEnquiries error in customer projects:', e.message);
      }

      // Filter CRM leads strictly matching the customer's phone
      const myLeads = leads.filter(l => normalizePhone(l.phone) === normCustomerPhone);

      // Also fetch any installation jobs matching the phone
      const { rows: myJobs } = await pool.query(
        `SELECT job_number, system_capacity_kw, system_type, status, scheduled_date,
                contract_amount, power_test_watts, safety_earthing_done, completion_notes
         FROM photonix_ops.installation_job
         WHERE replace(replace(replace(customer_phone, ' ', ''), '-', ''), '+91', '') LIKE '%' || $1
         ORDER BY created_at DESC`,
        [normCustomerPhone]
      );

      // Fetch customer invoices
      const { rows: myInvoices } = await pool.query(
        `SELECT id, invoice_number, enquiry_reference, system_capacity_kw, milestone_label,
                total_invoice_amount, status, created_at, due_date, paid_at, payment_method, payment_reference
         FROM photonix_ops.customer_invoice
         WHERE customer_phone = $1
         ORDER BY created_at DESC`,
        [normCustomerPhone]
      );

      res.json({
        phone: normCustomerPhone,
        projects: myLeads,
        jobs: myJobs,
        invoices: myInvoices
      });
    } catch (err) {
      console.error('Error fetching customer projects:', err);
      res.status(500).json({ error: 'Could not fetch project data' });
    }
  });

  // 3. Customer Quotation Details & Document Data (Strictly isolated by phone)
  router.get('/quotes/:reference', authenticateCustomer, async (req, res) => {
    const ref = String(req.params.reference || '').trim().toUpperCase();
    if (!/^PX-\d{6}$/.test(ref)) {
      return res.status(400).json({ error: 'Invalid reference format.' });
    }

    try {
      let leads = [];
      try { leads = await crm.listEnquiries({}); } catch {}
      const lead = leads.find(l => l.reference === ref);

      if (!lead) {
        return res.status(404).json({ error: 'Enquiry reference not found.' });
      }

      // STRICT PRIVACY CHECK: Lead phone MUST match logged in customer phone!
      if (normalizePhone(lead.phone) !== req.customer.phone) {
        return res.status(403).json({ error: 'Access denied: You are not authorized to view quotations for other customers.' });
      }

      if (!['sent', 'accepted'].includes(lead.quoteStatus)) {
        return res.status(404).json({
          error: 'Formal quotation has not been released yet for this project.',
          currentStatus: lead.quoteStatus,
          surveyStatus: lead.surveyStatus
        });
      }

      const q = lead.quoteDetails || {};
      const kw = Number(lead.preliminaryCapacityKw || q.capacityKw || 3.0);
      const grossPrice = Number(q.grossPrice || (kw * 60000));
      const subsidy = Number(q.estimatedSubsidy || (kw <= 1 ? 30000 : kw <= 2 ? 60000 : 78000));
      const netEffective = Number(q.netEffectiveCost || (grossPrice - subsidy));
      const panelCount = Number(q.panelCount || Math.ceil((kw * 1000) / 550));

      const quotationDocument = {
        company: {
          name: 'Photonix Solar Energy Solutions Pvt. Ltd.',
          cin: 'U40106MH2026PTC392811',
          gstin: '27AABCP8921M1Z4',
          registeredOffice: 'Plot 48, Photonix Tech Park, Baner-Pashan Link Road, Pune, Maharashtra 411045',
          contactEmail: 'solar@photonix.in',
          contactPhone: '+91 20 4910 8800',
          website: 'https://photonix.solar'
        },
        reference: lead.reference,
        date: lead.quoteCreatedAt || new Date().toISOString(),
        validUntil: new Date(Date.now() + 30 * 86400000).toISOString(),
        customer: {
          name: lead.customerName,
          phone: lead.phone,
          address: lead.address,
          propertyType: lead.propertyType || 'residential'
        },
        system: {
          capacityKw: kw,
          estimatedMonthlyGenerationKwh: Math.round(kw * 120),
          estimatedAnnualGenerationKwh: Math.round(kw * 1450),
          annualCo2OffsetTonnes: Number((kw * 1.3).toFixed(1)),
          panelCount,
          panelModel: 'Tier-1 TopCon Bi-facial 550Wp Monocrystalline PV Modules',
          inverterModel: `${kw} kW High-Efficiency On-Grid Smart MPPT Inverter (IP65)`,
          mountingStructure: 'HDGI Hot-Dip Galvanized Dual-Post Structure (150 km/h wind rated)',
          cablesAndBos: '4 sqmm FRLS Dual-Insulated Copper DC Cable with IP65 ACDB/DCDB SPD Protection',
          netMeteringInterconnection: 'Bi-directional Multi-Tariff DISCOM Interconnection Metering'
        },
        commercials: {
          grossContractAmount: grossPrice,
          centralSubsidyPmSuryaGhar: subsidy,
          netCustomerInvestment: netEffective,
          advanceBookingMilestone20Pct: Math.round(netEffective * 0.20),
          materialDeliveryMilestone70Pct: Math.round(netEffective * 0.70),
          commissioningMilestone10Pct: Math.round(netEffective * 0.10)
        },
        warranties: [
          { item: 'Solar PV Modules', duration: '25 Years', coverage: 'Linear Power Output Guarantee (min 84.8% at Year 25)' },
          { item: 'Grid-Tie Inverter', duration: '10 Years', coverage: 'Full Manufacturer Replacement Warranty' },
          { item: 'Mounting Structure', duration: '10 Years', coverage: 'Structural Integrity & Anti-Corrosion Warranty' },
          { item: 'Installation Workmanship', duration: '5 Years', coverage: 'Rooftop Waterproofing & Electrical Wiring Integrity' },
          { item: 'System Monitoring & O&M', duration: '1 Year', coverage: 'Complimentary On-Site Health Checks & Cloud Monitoring' }
        ],
        termsAndConditions: [
          'Subsidy is disbursed directly to the customer bank account via Direct Benefit Transfer (DBT) by the Ministry of New and Renewable Energy (MNRE) post net-meter installation.',
          'Quotation is valid for 30 calendar days from issue date.',
          'Installation begins within 7 working days following site readiness and receipt of 20% advance booking deposit.',
          'Photonix Solar handles complete documentation and liaison with the local DISCOM for net-metering approvals.'
        ]
      };

      res.json(quotationDocument);
    } catch (err) {
      console.error('Quotation details error:', err);
      res.status(500).json({ error: 'Could not fetch quotation details' });
    }
  });

  // 4. Create Customer Invoice (STRICTLY scoped to the logged-in person)
  router.post('/invoices', authenticateCustomer, async (req, res) => {
    const { reference, milestone = 'advance_20' } = req.body ?? {};
    const ref = String(reference || '').trim().toUpperCase();
    if (!/^PX-\d{6}$/.test(ref)) {
      return res.status(400).json({ error: 'Valid project reference required (e.g. PX-000001).' });
    }

    try {
      let leads = [];
      try { leads = await crm.listEnquiries({}); } catch {}
      const lead = leads.find(l => l.reference === ref);

      if (!lead) {
        return res.status(404).json({ error: 'Project enquiry not found.' });
      }

      // CRUCIAL SECURITY GATE: Only the logged-in customer matching this phone can generate an invoice!
      const leadPhone = normalizePhone(lead.phone);
      const customerPhone = req.customer.phone;
      if (leadPhone !== customerPhone) {
        return res.status(403).json({
          error: 'Permission denied: You can only generate invoices for your own verified solar project.'
        });
      }

      if (!['sent', 'accepted'].includes(lead.quoteStatus)) {
        return res.status(400).json({
          error: 'An invoice cannot be created before a formal quotation is approved and sent.',
          quoteStatus: lead.quoteStatus
        });
      }

      // Check if an invoice for this reference and milestone already exists (idempotency)
      const { rows: [existingInvoice] } = await pool.query(
        'SELECT * FROM photonix_ops.customer_invoice WHERE enquiry_reference = $1 AND milestone = $2',
        [ref, milestone]
      );
      if (existingInvoice) {
        return res.json({
          message: 'Existing invoice retrieved.',
          invoice: existingInvoice
        });
      }

      // Compute financial figures
      const q = lead.quoteDetails || {};
      const kw = Number(lead.preliminaryCapacityKw || q.capacityKw || 3.0);
      const grossPrice = Number(q.grossPrice || (kw * 60000));
      const subsidy = Number(q.estimatedSubsidy || (kw <= 1 ? 30000 : kw <= 2 ? 60000 : 78000));
      const netEffective = Number(q.netEffectiveCost || (grossPrice - subsidy));

      // Milestone calculation: 20% Advance Booking
      const milestonePercent = milestone === 'advance_20' ? 0.20 : 1.0;
      const milestoneLabel = milestone === 'advance_20'
        ? '20% Advance Booking & Procurement Fee'
        : 'Full Contract Amount';

      const totalInvoiceAmount = Math.round(netEffective * milestonePercent);
      const taxRate = 13.80; // 13.8% composite solar GST (70% goods @ 12%, 30% services @ 18%)
      const taxableAmount = Number((totalInvoiceAmount / (1 + taxRate / 100)).toFixed(2));
      const taxAmount = Number((totalInvoiceAmount - taxableAmount).toFixed(2));

      // Generate invoice number: PX-INV-2026-XXXX
      const { rows: [countRow] } = await pool.query('SELECT count(*) as cnt FROM photonix_ops.customer_invoice');
      const invoiceSeq = Number(countRow?.cnt || 0) + 1;
      const invoiceNumber = `PX-INV-2026-${String(invoiceSeq).padStart(4, '0')}`;

      // Insert into PostgreSQL customer_invoice
      const { rows: [newInvoice] } = await pool.query(
        `INSERT INTO photonix_ops.customer_invoice (
          invoice_number, customer_id, customer_phone, customer_name, customer_address,
          enquiry_reference, lead_id, system_capacity_kw, milestone, milestone_label,
          gross_system_cost, subsidy_amount, net_project_cost, invoice_taxable_amount,
          tax_rate_percent, tax_amount, total_invoice_amount, status
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, 'unpaid'
        ) RETURNING *`,
        [
          invoiceNumber,
          req.customer.sub,
          customerPhone,
          lead.customerName,
          lead.address,
          ref,
          lead.id,
          kw,
          milestone,
          milestoneLabel,
          grossPrice,
          subsidy,
          netEffective,
          taxableAmount,
          taxRate,
          taxAmount,
          totalInvoiceAmount
        ]
      );

      // Auto-update lead quoteStatus in CRM to 'accepted'
      try {
        await crm.generateQuote({
          id: lead.id,
          quoteAmount: lead.quoteAmount || netEffective,
          quoteDetails: { ...(lead.quoteDetails || {}), customerInvoiceNumber: invoiceNumber }
        });
      } catch {}

      res.status(201).json({
        message: 'Tax invoice created successfully.',
        invoice: newInvoice
      });
    } catch (err) {
      console.error('Customer invoice creation error:', err);
      res.status(500).json({ error: 'Invoice creation failed. Please try again.' });
    }
  });

  // 5. List Customer Invoices (STRICTLY customer-scoped)
  router.get('/invoices', authenticateCustomer, async (req, res) => {
    try {
      const customerPhone = req.customer.phone;
      const { rows: invoices } = await pool.query(
        `SELECT * FROM photonix_ops.customer_invoice
         WHERE customer_phone = $1 OR customer_id = $2
         ORDER BY created_at DESC`,
        [customerPhone, req.customer.sub]
      );
      res.json(invoices);
    } catch (err) {
      res.status(500).json({ error: 'Could not fetch invoices' });
    }
  });

  // 6. Get Single Invoice by ID (STRICTLY customer-scoped)
  router.get('/invoices/:id', authenticateCustomer, async (req, res) => {
    const id = req.params.id;
    try {
      const { rows: [invoice] } = await pool.query(
        'SELECT * FROM photonix_ops.customer_invoice WHERE id = $1',
        [id]
      );
      if (!invoice) {
        return res.status(404).json({ error: 'Invoice not found.' });
      }

      // STRICT PERMISSION CHECK: Must belong to current customer!
      if (normalizePhone(invoice.customer_phone) !== req.customer.phone) {
        return res.status(403).json({ error: 'Access denied: Invoice belongs to another customer.' });
      }

      res.json(invoice);
    } catch (err) {
      res.status(500).json({ error: 'Could not fetch invoice' });
    }
  });

  // 7. Customer Invoice Payment Simulation / Confirmation
  router.post('/invoices/:id/pay', authenticateCustomer, async (req, res) => {
    const id = req.params.id;
    const { method = 'upi', reference = 'UPI/' + Date.now() } = req.body ?? {};

    try {
      const { rows: [invoice] } = await pool.query(
        'SELECT * FROM photonix_ops.customer_invoice WHERE id = $1',
        [id]
      );
      if (!invoice) return res.status(404).json({ error: 'Invoice not found.' });
      if (normalizePhone(invoice.customer_phone) !== req.customer.phone) {
        return res.status(403).json({ error: 'Access denied: Invoice belongs to another customer.' });
      }

      const { rows: [updated] } = await pool.query(
        `UPDATE photonix_ops.customer_invoice
         SET status = 'paid', paid_at = now(), payment_method = $1, payment_reference = $2
         WHERE id = $3
         RETURNING *`,
        [method, reference, id]
      );

      res.json({ message: 'Payment confirmed. Booking confirmed!', invoice: updated });
    } catch (err) {
      res.status(500).json({ error: 'Payment recording failed.' });
    }
  });

  return (app) => {
    app.use('/api/customer', router);
  };
}
