import { mountBilling, outstandingSQL } from './invoice-routes.js';
import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import bcrypt from 'bcryptjs';

export function operationsRoutes({ pool }) {
  const router = Router();

  // ─── PUBLIC ROUTES ────────────────────────────────────────────────────────

  // 1. Live database statistics for trust section and home hero (no fake stats)
  router.get('/stats', async (_req, res) => {
    try {
      const { rows: [jobs] } = await pool.query(
        "SELECT count(*) filter (where status = 'completed') as completed, count(*) as total FROM photonix_ops.installation_job"
      );
      const { rows: [tickets] } = await pool.query(
        "SELECT count(*) filter (where status in ('open', 'assigned')) as open_tickets FROM photonix_ops.service_ticket"
      );
      const { rows: [techs] } = await pool.query(
        "SELECT count(*) as count FROM photonix_auth.account WHERE role in ('installer', 'surveyor', 'service_technician') AND state = 'active'"
      );

      res.json({
        completedInstallations: Number(jobs?.completed || 0),
        totalInstallations: Number(jobs?.total || 0),
        openWarrantyTickets: Number(tickets?.open_tickets || 0),
        activeTechnicians: Number(techs?.count || 0),
      });
    } catch (err) {
      console.error('Stats query error:', err);
      res.status(500).json({ error: 'Could not fetch system statistics' });
    }
  });

  // 2. Subsidy configuration from database with official portal reference
  router.get('/subsidy-config', async (_req, res) => {
    try {
      const { rows: [cfg] } = await pool.query(
        'SELECT scheme_name, last_verified, source_url, max_residential_subsidy, tier_1kw, tier_2kw, tier_3kw_plus FROM photonix_ops.subsidy_config WHERE id = 1'
      );
      if (!cfg) return res.status(404).json({ error: 'Subsidy configuration not found' });
      res.json({
        schemeName: cfg.scheme_name,
        lastVerified: cfg.last_verified ? new Date(cfg.last_verified).toISOString().slice(0, 10) : '2026-11-15',
        sourceUrl: cfg.source_url,
        maxResidentialSubsidy: Number(cfg.max_residential_subsidy),
        tiers: {
          '1kw': Number(cfg.tier_1kw),
          '2kw': Number(cfg.tier_2kw),
          '3kw_plus': Number(cfg.tier_3kw_plus),
        },
      });
    } catch {
      res.status(500).json({ error: 'Subsidy configuration unavailable' });
    }
  });

  // 3. Serial Number Warranty Lookup
  router.get('/warranty/check/:serial', async (req, res) => {
    const s = String(req.params.serial || '').trim().toUpperCase();
    if (!s) return res.status(400).json({ error: 'Serial number is required' });

    try {
      const { rows: [item] } = await pool.query(
        'SELECT serial_number, product_type, model_name, customer_name, dispatched_at, delivered_at, warranty_years, warranty_expires FROM photonix_ops.equipment_serial WHERE upper(serial_number) = $1',
        [s]
      );
      if (!item) return res.status(404).json({ error: 'No equipment found matching that serial number' });

      const now = new Date();
      const expires = item.warranty_expires ? new Date(item.warranty_expires) : null;
      const inWarranty = expires ? expires > now : false;

      res.json({
        serialNumber: item.serial_number,
        productType: item.product_type,
        modelName: item.model_name,
        customerName: item.customer_name,
        deliveryDate: item.delivered_at || item.dispatched_at,
        warrantyYears: item.warranty_years,
        warrantyExpires: item.warranty_expires,
        inWarranty,
      });
    } catch {
      res.status(500).json({ error: 'Warranty check service unavailable' });
    }
  });

  // 4. Contact Form Submission
  router.post('/contact', async (req, res) => {
    const { name, phone, email, subject, message } = req.body ?? {};
    if (!name?.trim() || !subject?.trim() || !message?.trim()) {
      return res.status(400).json({ error: 'Name, subject, and message are required' });
    }
    try {
      await pool.query(
        'INSERT INTO photonix_ops.contact_message (name, phone, email, subject, message) VALUES ($1, $2, $3, $4, $5)',
        [name.trim(), phone?.trim() || null, email?.trim() || null, subject.trim(), message.trim()]
      );
      res.status(201).json({ success: true, message: 'Message received. We will respond within one business day.' });
    } catch {
      res.status(500).json({ error: 'Could not record message' });
    }
  });

  // 5. Demo Accounts Retrieval (for demo mode login helper)
  router.get('/demo-accounts', async (_req, res) => {
    try {
      const p = process.env.PHOTONIX_DEMO_ACCOUNTS;
      if (!p) return res.status(404).json({ error: 'Demo accounts not configured' });
      const raw = await readFile(p, 'utf8');
      const accounts = JSON.parse(raw);
      const list = Object.entries(accounts).map(([role, acc]) => ({
        role: role === 'otherSales' ? 'sales' : role,
        email: acc.email,
        password: acc.password,
      }));
      res.json(list);
    } catch {
      res.status(500).json({ error: 'Demo accounts unavailable' });
    }
  });

  // ─── PROTECTED OPERATIONS ROUTES ──────────────────────────────────────────

  return (app, authenticate) => {
    // Mount public endpoints on app
    app.use('/api', router);

    const protectedRouter = Router();
    protectedRouter.use(authenticate);
    protectedRouter.get('/notifications', async (req,res)=>{
      const {role,id}=req.actor;
      const alerts=[];
      async function count(query, label, href, params=[]){
        const {rows:[row]}=await pool.query(query,params);
        if(Number(row.count)) alerts.push({count:Number(row.count),label,href});
      }
      if(role==='warehouse'||role==='dispatcher'){
        await count("SELECT count(*) FROM photonix_ops.equipment_serial WHERE status='packed'",'Packed items ready for dispatch','/staff/packing');
        await count("SELECT count(*) FROM photonix_ops.equipment_serial WHERE dispatched_at IS NOT NULL AND delivered_at IS NULL AND status='dispatched'",'Dispatched items awaiting delivery','/staff/dispatch');
      }      if (['admin','director','manager','installer'].includes(role))
        await count("SELECT count(*) FROM photonix_ops.installation_job WHERE status='blocked'"+(role==='installer'?' AND technician_id=$1':''),'Blocked installations','/staff/installations',role==='installer'?[id]:[]);
      if (['admin','director','support','service_technician'].includes(role))
        await count("SELECT count(*) FROM photonix_ops.service_ticket WHERE status='open'",'Open service tickets','/staff/complaints');
      if (['sales','surveyor','technical_reviewer'].includes(role)){
        const rules={
          sales:["qualification_state='new' AND sales_id=$1",'Enquiries to qualify','/staff/enquiries',[id]],
          surveyor:["survey_status='assigned' AND assigned_surveyor_id=$1",'Assigned surveys','/staff/site-visits',[id]],
          technical_reviewer:["survey_status='submitted'",'Surveys awaiting review','/staff/survey-approvals',[]]
        };
        const [where,label,link,params]=rules[role];
        await count('SELECT count(*) FROM photonix_crm.enquiry WHERE '+where,label,link,params);
      }
      if(['finance','admin','director'].includes(role))
        await count("SELECT count(*) FROM photonix_ops.invoice i WHERE i.amount > (SELECT coalesce(sum(r.amount),0) FROM photonix_ops.receipt r WHERE r.job_id=i.job_id)",'Invoices with a balance','/staff/finance');
      if(['admin','verifier'].includes(role))
        await count('SELECT count(*) FROM photonix_auth.account WHERE state=$1','Staff applications to review',role==='admin'?'/staff/admissions':'/staff/identity-checks',[role==='admin'?'verified':'pending']);
      res.json(alerts);
    });
    mountBilling(protectedRouter,pool);

    // ─── DIRECTOR & MANAGEMENT REPORTING (Scope 6) ──────────────────────────
    protectedRouter.get('/director/overview', async (req, res) => {
      if (!['director', 'manager', 'admin'].includes(req.actor.role)) return res.sendStatus(403);
      const range = req.query.range || 'month'; // 'today', 'week', 'month', 'all'

      let interval = "interval '30 days'";
      if (range === 'today') interval = "interval '1 day'";
      else if (range === 'week') interval = "interval '7 days'";
      else if (range === 'all') interval = "interval '10 years'";

      try {
        // Financial summary from completed jobs
        const { rows: [fin] } = await pool.query(`
          SELECT
            count(*) as total_jobs,
            count(*) filter (where status = 'completed') as completed_jobs,
            count(*) filter (where status = 'in_progress') as in_progress_jobs,
            count(*) filter (where status = 'scheduled') as scheduled_jobs,
            coalesce(sum(contract_amount) filter (where status = 'completed'), 0) as total_revenue,
            coalesce(sum(equipment_cost) filter (where status = 'completed'), 0) as total_equipment_cost,
            coalesce(sum(labour_cost) filter (where status = 'completed'), 0) as total_labour_cost,
            coalesce(sum(contract_amount - equipment_cost - labour_cost) filter (where status = 'completed'), 0) as net_profit
          FROM photonix_ops.installation_job
          WHERE created_at >= (now() - ${interval});
        `);

        // Profit per job breakdown
        const { rows: jobs } = await pool.query(`
          SELECT
            id, job_number, customer_name, system_capacity_kw, system_type,
            status, scheduled_date, contract_amount, equipment_cost, labour_cost,
            (contract_amount - equipment_cost - labour_cost) as profit,
            case when contract_amount > 0 then round(((contract_amount - equipment_cost - labour_cost) * 100.0 / contract_amount), 1) else 0 end as margin_pct
          FROM photonix_ops.installation_job
          ORDER BY scheduled_date DESC
          LIMIT 50;
        `);

        // Technician pay & hours
        const { rows: techPay } = await pool.query(`
          SELECT
            technician_name,
            count(*) filter (where status = 'completed') as jobs_completed,
            sum(system_capacity_kw) filter (where status = 'completed') as total_kw_installed,
            coalesce(sum(labour_cost) filter (where status = 'completed'), 0) as total_pay
          FROM photonix_ops.installation_job
          WHERE technician_name IS NOT NULL
          GROUP BY technician_name
          ORDER BY total_pay DESC;
        `);

        // Open Repairs and Warranty Tickets
        const { rows: repairs } = await pool.query(`
          SELECT ticket_number, serial_number, product_type, customer_name, customer_phone, issue_description, status, in_warranty, parts_cost, labour_cost, created_at
          FROM photonix_ops.service_ticket
          ORDER BY created_at DESC;
        `);

        // Automation rules status
        const { rows: rules } = await pool.query(`
          SELECT id, name, description, trigger_event, is_active, last_run_at, run_count, last_status
          FROM photonix_ops.automation_rule
          ORDER BY name;
        `);

        res.json({
          range,
          outstandingInvoices: Number((await pool.query(outstandingSQL)).rows[0].outstanding),
          financials: {
            totalRevenue: Number(fin.total_revenue),
            equipmentCost: Number(fin.total_equipment_cost),
            labourCost: Number(fin.total_labour_cost),
            netProfit: Number(fin.net_profit),
            marginPct: fin.total_revenue > 0 ? Math.round((fin.net_profit * 100) / fin.total_revenue) : 0,
            completedJobs: Number(fin.completed_jobs),
            inProgressJobs: Number(fin.in_progress_jobs),
            scheduledJobs: Number(fin.scheduled_jobs),
            totalJobs: Number(fin.total_jobs),
          },
          jobs,
          technicianPay: techPay,
          repairs,
          automationRules: rules,
        });
      } catch (err) {
        console.error('Director overview error:', err);
        res.status(500).json({ error: 'Could not compile director metrics' });
      }
    });

    // ─── WAREHOUSE DISPATCH & SERIAL SCANNING (Scope 3) ──────────────────────
    protectedRouter.get('/warehouse/packing', async (req, res) => {
      if (!['warehouse', 'dispatcher', 'director', 'admin'].includes(req.actor.role)) return res.sendStatus(403);
      try {
        const { rows: items } = await pool.query(`
          SELECT id, serial_number, product_type, model_name, lead_id, customer_name, status, scanned_at, dispatched_at, warranty_years
          FROM photonix_ops.equipment_serial
          ORDER BY created_at DESC;
        `);
        res.json(items);
      } catch {
        res.status(500).json({ error: 'Could not load packing items' });
      }
    });

    protectedRouter.post('/warehouse/scan', async (req, res) => {
      if (!['warehouse', 'dispatcher', 'admin'].includes(req.actor.role)) return res.sendStatus(403);
      const { serialNumber, customerName, leadId, productType, modelName } = req.body ?? {};
      if (!serialNumber?.trim()) return res.status(400).json({ error: 'Serial number is required' });

      const s = serialNumber.trim().toUpperCase();
      try {
        const warrantyYears = productType === 'panel' ? 20 : 2;
        const now = new Date();
        const expires = new Date(now.getTime() + warrantyYears * 365 * 86400000);

        const { rows: [scanned] } = await pool.query(`
          INSERT INTO photonix_ops.equipment_serial (
            serial_number, product_type, model_name, lead_id, customer_name, status, scanned_at, dispatched_at, delivered_at, warranty_years, warranty_expires
          ) VALUES ($1, $2, $3, $4, $5, 'dispatched', now(), now(), now(), $6, $7)
          ON CONFLICT (serial_number) DO UPDATE SET
            status = 'dispatched',
            scanned_at = now(),
            dispatched_at = now(),
            delivered_at = now(),
            warranty_expires = $7
          RETURNING *;
        `, [s, productType || 'inverter', modelName || 'Standard Equipment', leadId || null, customerName || 'Dispatched Customer', warrantyYears, expires]);

        res.json({ message: 'Serial scanned and dispatched. Warranty clock started.', item: scanned });
      } catch (err) {
        console.error('Scan error:', err);
        res.status(500).json({ error: 'Could not record scanned serial' });
      }
    });

    // ─── INSTALLATION FIELD COMPLETION (Scope 4) ────────────────────────────
    protectedRouter.get('/installations', async (req, res) => {
      if (!['installer', 'dispatcher', 'director', 'manager', 'admin'].includes(req.actor.role)) return res.sendStatus(403);
      try {
        let query = 'SELECT * FROM photonix_ops.installation_job ORDER BY scheduled_date DESC';
        const params = [];
        if (req.actor.role === 'installer') {
          query = 'SELECT * FROM photonix_ops.installation_job WHERE technician_id = $1 ORDER BY scheduled_date DESC';
          params.push(req.actor.id);
        }
        const { rows } = await pool.query(query, params);
        res.json(rows);
      } catch {
        res.status(500).json({ error: 'Could not load installations' });
      }
    });

    protectedRouter.post('/installations/:id/complete', async (req, res) => {
      if (!['installer', 'director', 'admin'].includes(req.actor.role)) return res.sendStatus(403);
      const { id } = req.params;
      const { powerTestWatts, completionNotes, customerSignature, safetyEarthing, mountingChecked, wiringChecked } = req.body ?? {};

      if (!powerTestWatts || Number(powerTestWatts) <= 0) {
        return res.status(400).json({ error: 'Valid power test wattage is required before job sign-off.' });
      }
      if (!customerSignature?.trim()) {
        return res.status(400).json({ error: 'Customer acceptance signature is required as proof of work.' });
      }

      try {
        const { rows: [job] } = await pool.query(`
          UPDATE photonix_ops.installation_job
          SET status = 'completed',
              finish_time = now(),
              power_test_watts = $2,
              completion_notes = $3,
              customer_signature = $4,
              safety_earthing_done = $5,
              mounting_checked = $6,
              wiring_checked = $7
          WHERE id = $1
          RETURNING *;
        `, [id, Number(powerTestWatts), completionNotes?.trim() || 'Work completed and tested.', customerSignature.trim(), Boolean(safetyEarthing), Boolean(mountingChecked), Boolean(wiringChecked)]);

        if (!job) return res.status(404).json({ error: 'Installation job not found' });
        res.json({ message: 'Installation completed and customer signed off.', job });
      } catch (err) {
        console.error('Job completion error:', err);
        res.status(500).json({ error: 'Could not record job completion' });
      }
    });

    // ─── SERVICE & WARRANTY TICKETS (Scope 5) ───────────────────────────────
    protectedRouter.get('/support/tickets', async (req, res) => {
      if (!['support', 'service_technician', 'director', 'admin'].includes(req.actor.role)) return res.sendStatus(403);
      try {
        const { rows } = await pool.query('SELECT * FROM photonix_ops.service_ticket ORDER BY created_at DESC');
        res.json(rows);
      } catch {
        res.status(500).json({ error: 'Could not load service tickets' });
      }
    });

    protectedRouter.post('/support/tickets', async (req, res) => {
      if (!['support', 'sales', 'director', 'admin'].includes(req.actor.role)) return res.sendStatus(403);
      const { serialNumber, customerName, customerPhone, issueDescription } = req.body ?? {};
      if (!serialNumber?.trim() || !customerName?.trim() || !issueDescription?.trim()) {
        return res.status(400).json({ error: 'Serial number, customer name, and issue description are required.' });
      }

      const s = serialNumber.trim().toUpperCase();
      try {
        // Retrieve warranty status from serial registry
        const { rows: [item] } = await pool.query(
          'SELECT product_type, warranty_expires FROM photonix_ops.equipment_serial WHERE upper(serial_number) = $1',
          [s]
        );

        const now = new Date();
        const inWarranty = item?.warranty_expires ? new Date(item.warranty_expires) > now : false;

        // Auto-billing rule: in-warranty = free; out-of-warranty = automatic parts & labour billing
        const partsCost = inWarranty ? 0 : 3500;
        const labourCost = inWarranty ? 0 : 1500;

        const ticketNumber = `TCK-2026-${Math.floor(1000 + Math.random() * 9000)}`;
        const { rows: [ticket] } = await pool.query(`
          INSERT INTO photonix_ops.service_ticket (
            ticket_number, serial_number, product_type, customer_name, customer_phone,
            issue_description, in_warranty, parts_cost, labour_cost, status
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'open')
          RETURNING *;
        `, [
          ticketNumber, s, item?.product_type || 'equipment',
          customerName.trim(), customerPhone?.trim() || '',
          issueDescription.trim(), inWarranty, partsCost, labourCost
        ]);

        res.status(201).json({
          message: inWarranty
            ? 'Ticket logged: covered under warranty. Free repair authorized.'
            : 'Ticket logged: unit out of warranty. Parts and labour billed automatically.',
          ticket
        });
      } catch (err) {
        console.error('Ticket creation error:', err);
        res.status(500).json({ error: 'Could not create service ticket' });
      }
    });

    protectedRouter.post('/support/tickets/:id/resolve', async (req, res) => {
      if (!['support', 'service_technician', 'director', 'admin'].includes(req.actor.role)) return res.sendStatus(403);
      const { id } = req.params;
      const { technicianNotes, customerConfirmed } = req.body ?? {};

      try {
        const status = customerConfirmed ? 'customer_confirmed' : 'resolved';
        const { rows: [ticket] } = await pool.query(`
          UPDATE photonix_ops.service_ticket
          SET status = $2,
              technician_notes = $3,
              resolution_confirmed_at = case when $2 = 'customer_confirmed' then now() else resolution_confirmed_at end
          WHERE id = $1
          RETURNING *;
        `, [id, status, technicianNotes?.trim() || 'Service performed']);

        if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
        res.json({ message: 'Ticket updated', ticket });
      } catch {
        res.status(500).json({ error: 'Could not update ticket' });
      }
    });

    // ─── AUTOMATION RULES & LOG (Scope 6 & Settings) ────────────────────────
    protectedRouter.get('/automations', async (req, res) => {
      if (!['director', 'manager', 'admin'].includes(req.actor.role)) return res.sendStatus(403);
      try {
        const { rows: rules } = await pool.query('SELECT * FROM photonix_ops.automation_rule ORDER BY name');
        res.json(rules);
      } catch {
        res.status(500).json({ error: 'Could not load automation rules' });
      }
    });

    // ─── STAFF PERSONNEL & USER DIRECTORY (Director / Admin) ─────────────────
    protectedRouter.get('/staff/users', async (req, res) => {
      if (!['director', 'admin', 'manager'].includes(req.actor.role)) return res.sendStatus(403);
      try {
        const { rows: users } = await pool.query(`
          SELECT id, email, role, state, created_at
          FROM photonix_auth.account
          ORDER BY role, email
        `);
        res.json(users);
      } catch (err) {
        console.error('Error fetching staff users:', err);
        res.status(500).json({ error: 'Could not fetch staff directory' });
      }
    });

    protectedRouter.post('/staff/users', async (req, res) => {
      if (!['director', 'admin'].includes(req.actor.role)) return res.sendStatus(403);
      const { email, role, password } = req.body ?? {};
      if (typeof email !== 'string' || email.length > 254 || !role || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        return res.status(400).json({ error: 'Valid email and role are required.' });
      }
      const allowedRoles = ['sales', 'surveyor', 'technical_reviewer', 'warehouse', 'installer', 'support', 'director', 'manager', 'finance', 'admin', 'verifier'];
      if (!allowedRoles.includes(role)) {
        return res.status(400).json({ error: 'Invalid staff role provided.' });
      }
      try {
        if (typeof password !== 'string' || password.length < 12 || Buffer.byteLength(password) > 72) return res.status(400).json({ error: 'Use a password of at least 12 characters and at most 72 bytes.' });
        const hash = await bcrypt.hash(password, 12);
        const { rows: [newUser] } = await pool.query(`
          INSERT INTO photonix_auth.account (id, email, password_hash, role, state)
          VALUES ($1, $2, $3, $4, 'active')
          ON CONFLICT (email) DO NOTHING
          RETURNING id, email, role, state, created_at;
        `, [randomUUID(), email.trim().toLowerCase(), hash, role]);
        if (!newUser) return res.status(409).json({ error: 'A staff account already uses this email.' });
        res.status(201).json(newUser);
      } catch (err) {
        console.error('Error creating staff account:', err);
        res.status(500).json({ error: 'Could not create staff user' });
      }
    });

    protectedRouter.patch('/staff/users/:id/state', async (req, res) => {
      if (!['director', 'admin'].includes(req.actor.role)) return res.sendStatus(403);
      const { id } = req.params;
      const { state } = req.body ?? {};
      if (!['active', 'suspended'].includes(state)) {
        return res.status(400).json({ error: "State must be 'active' or 'suspended'." });
      }
      if (id === req.actor.id) {
        return res.status(400).json({ error: 'You cannot suspend your own account.' });
      }
      try {
        const { rows: [updated] } = await pool.query(`
          UPDATE photonix_auth.account
          SET state = $1
          WHERE id = $2
          RETURNING id, email, role, state;
        `, [state, id]);
        if (!updated) return res.status(404).json({ error: 'User account not found.' });
        res.json(updated);
      } catch (err) {
        console.error('Error updating staff state:', err);
        res.status(500).json({ error: 'Could not update user status' });
      }
    });

    // ─── FINANCE & INVOICE LEDGER (Director / Finance / Admin) ───────────────
    protectedRouter.get('/finance/overview', async (req, res) => {
      if (!['director', 'finance', 'admin', 'manager'].includes(req.actor.role)) return res.sendStatus(403);
      try {
        const { rows: jobs } = await pool.query(`
          SELECT j.*, i.number AS invoice_number,i.amount AS invoice_amount,i.issued_at,
            coalesce(r.collected,0) AS collected,coalesce(r.receipts,'[]'::jsonb) AS receipts
          FROM photonix_ops.installation_job j
          LEFT JOIN photonix_ops.invoice i ON i.job_id=j.id
          LEFT JOIN LATERAL (
            SELECT sum(amount) AS collected,jsonb_agg(to_jsonb(receipt) ORDER BY recorded_at DESC) AS receipts
            FROM photonix_ops.receipt receipt WHERE receipt.job_id=j.id
          ) r ON true ORDER BY j.created_at DESC
        `);

        let totalRevenue = 0;
        let totalEquipment = 0;
        let totalLabour = 0;
        const invoices = jobs.map((job, idx) => {
          const rev = Number(job.contract_amount || 0);
          const eq = Number(job.equipment_cost || 0);
          const lab = Number(job.labour_cost || 0);
          totalRevenue += rev;
          totalEquipment += eq;
          totalLabour += lab;

          const invoiceAmount=Number(job.invoice_amount || 0);
          const collected=Number(job.collected);
          const balance=Math.round((invoiceAmount-collected)*100)/100;
          const subsidyEstimate = Math.min(78000, Number(job.system_capacity_kw) <= 2 ? Number(job.system_capacity_kw) * 30000 : 78000);

          return {
            id: job.id,
            invoiceNumber: job.invoice_number ? 'INV-'+String(job.invoice_number).padStart(6,'0') : 'Unbilled',
            issued: Boolean(job.invoice_number), invoiceAmount,collected,receipts:job.receipts,
            jobNumber: job.job_number,
            customerName: job.customer_name,
            customerPhone: job.customer_phone,
            systemCapacityKw: Number(job.system_capacity_kw),
            systemType: job.system_type,
            status: job.status,
            contractAmount: rev,
            equipmentCost: eq,
            labourCost: lab,
            profit: rev - (eq + lab),
            marginPercent: rev > 0 ? Number((((rev - (eq + lab)) / rev) * 100).toFixed(1)) : 0,

            balanceDue: balance,
            paymentStatus: !job.invoice_number ? 'unbilled' : balance === 0 ? 'paid_in_full' : collected > 0 ? 'partial' : 'pending',
            subsidyEstimate,
            subsidyStatus: job.status === 'completed' ? 'disbursed' : 'submitted',
            date: job.scheduled_date || job.created_at
          };
        });

        const netProfit = totalRevenue - (totalEquipment + totalLabour);
        const overallMargin = totalRevenue > 0 ? Number(((netProfit / totalRevenue) * 100).toFixed(1)) : 0;

        res.json({
          canWrite:['finance','admin'].includes(req.actor.role),
          summary: {
            billed: invoices.reduce((sum,i)=>sum+i.invoiceAmount,0),
            outstanding: invoices.reduce((sum,i)=>sum+i.balanceDue,0),
            totalRevenue,
            totalEquipment,
            totalLabour,
            netProfit,
            overallMargin,
            totalJobsCount: jobs.length,
            completedCount: jobs.filter(j => j.status === 'completed').length
          },
          invoices
        });
      } catch (err) {
        console.error('Error fetching finance overview:', err);
        res.status(500).json({ error: 'Could not load finance overview' });
      }
    });

    app.use('/api', protectedRouter);
  };
}
