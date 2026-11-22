import pg from 'pg';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is required to seed realistic data.');
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function seed() {
  const client = await pool.connect();
  try {
    const { readFileSync } = await import('node:fs');
    const opsSql = readFileSync(new URL('./ops-schema.sql', import.meta.url), 'utf8');
    await client.query(opsSql);
    await client.query(readFileSync(new URL('./invoice-schema.sql', import.meta.url), 'utf8'));

    await client.query('BEGIN');

    // Grant access to photonix_api
    await client.query(`
      GRANT USAGE ON SCHEMA photonix_ops TO photonix_api;
      GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA photonix_ops TO photonix_api;
      GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA photonix_ops TO photonix_api;
    `);

    // 1. Seed Default Subsidy Config
    await client.query(`
      INSERT INTO photonix_ops.subsidy_config (id, scheme_name, last_verified, source_url, max_residential_subsidy, tier_1kw, tier_2kw, tier_3kw_plus)
      VALUES (1, 'PM Surya Ghar Muft Bijli Yojana', '2026-11-15', 'https://pmsuryaghar.gov.in', 78000, 30000, 60000, 78000)
      ON CONFLICT (id) DO UPDATE SET
        last_verified = EXCLUDED.last_verified,
        source_url = EXCLUDED.source_url,
        max_residential_subsidy = EXCLUDED.max_residential_subsidy;
    `);

    // 2. Seed Default Automation Rules
    const defaultRules = [
      {
        name: 'Order Confirmed - Auto Packing & Crew Dispatch',
        description: 'Automatically creates warehouse pick list and places job on the installation crew schedule.',
        trigger_event: 'order_confirmed',
        action_name: 'create_pick_list_and_schedule_crew',
        run_count: 38,
        last_status: 'success',
      },
      {
        name: 'Delivery Confirmed - Auto Start Serial Warranty',
        description: 'Starts product warranty countdown per scanned serial (inverter/battery 2 yrs, panels 20 yrs).',
        trigger_event: 'delivery_completed',
        action_name: 'start_serial_warranty',
        run_count: 35,
        last_status: 'success',
      },
      {
        name: 'Low Inventory Threshold Alert',
        description: 'Creates automatic purchase request when inverter or battery stock falls below 5 units.',
        trigger_event: 'low_stock_threshold',
        action_name: 'generate_purchase_request',
        run_count: 4,
        last_status: 'success',
      },
      {
        name: '30-Day Warranty Expiry Customer Notification',
        description: 'Sends automated maintenance notice and extension options 30 days before inverter warranty ends.',
        trigger_event: 'warranty_expiring_30d',
        action_name: 'send_warranty_renewal_notice',
        run_count: 12,
        last_status: 'success',
      },
    ];

    for (const rule of defaultRules) {
      await client.query(`
        INSERT INTO photonix_ops.automation_rule (name, description, trigger_event, action_name, is_active, last_run_at, run_count, last_status)
        VALUES ($1, $2, $3, $4, true, now() - interval '2 hours', $5, $6)
        ON CONFLICT (name) DO UPDATE SET run_count = EXCLUDED.run_count, last_status = EXCLUDED.last_status;
      `, [rule.name, rule.description, rule.trigger_event, rule.action_name, rule.run_count, rule.last_status]);
    }

    // 3. Seed 15 Certified Technicians
    const technicianNames = [
      'Amit Sharma', 'Rakesh Verma', 'Suresh Patel', 'Manoj Kumar', 'Vikram Singh',
      'Dinesh Joshi', 'Anil Yadav', 'Rajesh Gupta', 'Pradeep Reddy', 'Santosh Nair',
      'Kailash Choudhary', 'Gopal Krishnan', 'Harish Chandra', 'Sunil Meena', 'Pankaj Mishra'
    ];

    const passwordHash = await bcrypt.hash('TechPassword@2026', 10);
    const techIds = [];

    for (let i = 0; i < technicianNames.length; i++) {
      const email = `tech.${technicianNames[i].toLowerCase().replace(' ', '.')}@photonix.local`;
      const techRole = i < 10 ? 'installer' : (i < 13 ? 'surveyor' : 'service_technician');
      const { rows: [acc] } = await client.query(`
        INSERT INTO photonix_auth.account (id, email, password_hash, role, state, created_at)
        VALUES ($1, $2, $3, $4, 'active', now() - interval '6 months')
        ON CONFLICT (email) DO UPDATE SET state = 'active'
        RETURNING id;
      `, [randomUUID(), email, passwordHash, techRole]);
      techIds.push({ id: acc.id, name: technicianNames[i] });
    }

    // 4. Seed ~40 Jobs per month (realistic distribution across stages and margins)
    const customerFirstNames = ['Rajesh', 'Suresh', 'Pooja', 'Vikram', 'Ananya', 'Ramesh', 'Sunita', 'Kiran', 'Deepak', 'Meera', 'Alok', 'Sneha', 'Gaurav', 'Neha', 'Nitin', 'Divya', 'Arun', 'Priya', 'Kavita', 'Sanjay'];
    const customerLastNames = ['Kumar', 'Sharma', 'Patel', 'Verma', 'Gupta', 'Singh', 'Reddy', 'Joshi', 'Choudhary', 'Nair', 'Mehta', 'Bhatia', 'Yadav', 'Rao', 'Shah', 'Aggarwal', 'Mishra', 'Pandey', 'Saxena', 'Trivedi'];
    const cities = ['Jaipur', 'Ahmedabad', 'Pune', 'Indore', 'Lucknow', 'Nagpur', 'Bhopal', 'Surat', 'Chandigarh', 'Dehradun'];

    // Clear existing operational seed data to ensure clean numbers
    await client.query('DELETE FROM photonix_ops.equipment_serial WHERE serial_number LIKE \'INV-%\' OR serial_number LIKE \'BAT-%\' OR serial_number LIKE \'PAN-%\'');
    await client.query('DELETE FROM photonix_ops.installation_job WHERE job_number LIKE \'JOB-%\'');
    await client.query('DELETE FROM photonix_ops.service_ticket WHERE ticket_number LIKE \'TCK-%\'');

    const capacities = [1, 2, 3, 3, 3, 4, 5];
    const systemTypes = ['on_grid', 'on_grid', 'on_grid', 'off_grid'];
    const statuses = ['completed', 'completed', 'completed', 'in_progress', 'scheduled'];

    for (let i = 1; i <= 42; i++) {
      const cFirst = customerFirstNames[i % customerFirstNames.length];
      const cLast = customerLastNames[(i * 3) % customerLastNames.length];
      const custName = `${cFirst} ${cLast}`;
      const city = cities[i % cities.length];
      const phone = `+91 ${9800000000 + (i * 12345) % 19999999}`;
      const addr = `Plot ${10 + i}, Sector ${1 + (i % 15)}, ${city}`;
      const kw = capacities[i % capacities.length];
      const sysType = systemTypes[i % systemTypes.length];
      const status = statuses[i % statuses.length];
      const tech = techIds[i % techIds.length];

      // Realistic Job Financials (INR):
      // Gross Contract: ~₹55,000 to ₹65,000 per kW on-grid; +₹40,000 for battery bank off-grid
      const baseContract = kw * (sysType === 'on_grid' ? 58000 : 82000);
      const equipmentCost = Math.round(baseContract * 0.62);
      const labourCost = Math.round(kw * 3500 + 4000);

      const jobNumber = `JOB-2026-${String(i).padStart(4, '0')}`;
      const schedDate = new Date();
      schedDate.setDate(schedDate.getDate() - (45 - i));

      const startTime = status !== 'scheduled' ? new Date(schedDate.getTime() + 9 * 3600000) : null;
      const finishTime = status === 'completed' ? new Date(schedDate.getTime() + 17 * 3600000) : null;
      const powerTest = status === 'completed' ? (kw * 1000 * (0.88 + (i % 10) * 0.01)) : null;

      const { rows: [job] } = await client.query(`
        INSERT INTO photonix_ops.installation_job (
          job_number, lead_id, customer_name, customer_phone, address,
          system_capacity_kw, system_type, technician_id, technician_name,
          scheduled_date, start_time, finish_time, power_test_watts,
          safety_earthing_done, mounting_checked, wiring_checked, customer_signature,
          completion_notes, status, contract_amount, equipment_cost, labour_cost, created_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
          $14, $15, $16, $17, $18, $19, $20, $21, $22, $23
        ) RETURNING id;
      `, [
        jobNumber, i, custName, phone, addr, kw, sysType,
        tech.id, tech.name, schedDate.toISOString().slice(0, 10),
        startTime, finishTime, powerTest,
        status === 'completed', status === 'completed', status === 'completed',
        status === 'completed' ? `data:image/svg+xml;utf8,<svg><text>${custName}</text></svg>` : null,
        status === 'completed' ? 'Grid synchronized smoothly. Inverter anti-islanding test passed.' : null,
        status, baseContract, equipmentCost, labourCost,
        schedDate
      ]);

      // 5. Seed Equipment Serials per Job
      const invSerial = `INV-2026-${String(1000 + i)}`;
      const panSerial = `PAN-2026-${String(5000 + i * 4)}`;
      const deliveryDate = status === 'completed' ? schedDate : (status === 'in_progress' ? new Date() : null);

      // Inverter (2 year warranty)
      await client.query(`
        INSERT INTO photonix_ops.equipment_serial (
          serial_number, product_type, model_name, lead_id, customer_name, customer_phone,
          status, scanned_at, dispatched_at, delivered_at, warranty_years, warranty_expires
        ) VALUES ($1, 'inverter', $2, $3, $4, $5, $6, $7, $7, $8, 2, $9)
        ON CONFLICT (serial_number) DO NOTHING;
      `, [
        invSerial, `${kw}kW Pure Sine String Inverter`, i, custName, phone,
        status === 'completed' ? 'installed' : (status === 'in_progress' ? 'dispatched' : 'packed'),
        deliveryDate || new Date(), deliveryDate,
        deliveryDate ? new Date(deliveryDate.getTime() + 2 * 365 * 86400000) : null
      ]);

      // Solar Panels (20 year warranty)
      await client.query(`
        INSERT INTO photonix_ops.equipment_serial (
          serial_number, product_type, model_name, lead_id, customer_name, customer_phone,
          status, scanned_at, dispatched_at, delivered_at, warranty_years, warranty_expires
        ) VALUES ($1, 'panel', $2, $3, $4, $5, $6, $7, $7, $8, 20, $9)
        ON CONFLICT (serial_number) DO NOTHING;
      `, [
        panSerial, '250Wp Monocrystalline Tier-1 Panel', i, custName, phone,
        status === 'completed' ? 'installed' : (status === 'in_progress' ? 'dispatched' : 'packed'),
        deliveryDate || new Date(), deliveryDate,
        deliveryDate ? new Date(deliveryDate.getTime() + 20 * 365 * 86400000) : null
      ]);

      // Batteries if off-grid
      if (sysType === 'off_grid') {
        const batSerial = `BAT-2026-${String(2000 + i)}`;
        await client.query(`
          INSERT INTO photonix_ops.equipment_serial (
            serial_number, product_type, model_name, lead_id, customer_name, customer_phone,
            status, scanned_at, dispatched_at, delivered_at, warranty_years, warranty_expires
          ) VALUES ($1, 'battery', '150Ah C10 Solar Tubular Battery', $2, $3, $4, $5, $6, $6, $7, 2, $8)
          ON CONFLICT (serial_number) DO NOTHING;
        `, [
          batSerial, i, custName, phone,
          status === 'completed' ? 'installed' : 'packed',
          deliveryDate || new Date(), deliveryDate,
          deliveryDate ? new Date(deliveryDate.getTime() + 2 * 365 * 86400000) : null
        ]);
      }
    }

    // 6. Seed Support & Warranty Service Tickets (both in-warranty and out-of-warranty)
    const ticketFixtures = [
      {
        ticket_number: 'TCK-2026-0001',
        serial_number: 'INV-2026-1002',
        product_type: 'inverter',
        customer_name: 'Pooja Sharma',
        customer_phone: '+91 9823456789',
        issue_description: 'Error 03 grid voltage surge trip after thunderstorm.',
        status: 'open',
        in_warranty: true,
        parts_cost: 0,
        labour_cost: 0,
        technician_notes: 'Scheduled for SPD replacement under warranty.'
      },
      {
        ticket_number: 'TCK-2026-0002',
        serial_number: 'INV-2024-0018',
        product_type: 'inverter',
        customer_name: 'Ramesh Verma',
        customer_phone: '+91 9812345678',
        issue_description: 'Display backlight failed; warranty expired 4 months ago.',
        status: 'assigned',
        in_warranty: false,
        parts_cost: 3200,
        labour_cost: 1500,
        technician_notes: 'Customer accepted out-of-warranty quote. Replacement display module dispatched.'
      },
      {
        ticket_number: 'TCK-2026-0003',
        serial_number: 'PAN-2026-5012',
        product_type: 'panel',
        customer_name: 'Vikram Joshi',
        customer_phone: '+91 9876501234',
        issue_description: 'Micro-crack detected after hail; generation dropped by 22%.',
        status: 'resolved',
        in_warranty: true,
        parts_cost: 0,
        labour_cost: 0,
        technician_notes: 'Single 250Wp panel swapped under 20-year performance warranty.'
      },
      {
        ticket_number: 'TCK-2026-0004',
        serial_number: 'BAT-2026-2004',
        product_type: 'battery',
        customer_name: 'Sunita Meena',
        customer_phone: '+91 9898765432',
        issue_description: 'Battery terminal corrosion and backup duration decreased to 1 hour.',
        status: 'customer_confirmed',
        in_warranty: true,
        parts_cost: 0,
        labour_cost: 0,
        technician_notes: 'Cleaned terminals, added electrolyte water, equalizing charge applied. Customer confirmed backup restored.'
      }
    ];

    for (const t of ticketFixtures) {
      await client.query(`
        INSERT INTO photonix_ops.service_ticket (
          ticket_number, serial_number, product_type, customer_name, customer_phone,
          issue_description, status, in_warranty, parts_cost, labour_cost, technician_notes,
          resolution_confirmed_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT (ticket_number) DO NOTHING;
      `, [
        t.ticket_number, t.serial_number, t.product_type, t.customer_name, t.customer_phone,
        t.issue_description, t.status, t.in_warranty, t.parts_cost, t.labour_cost, t.technician_notes,
        t.status === 'customer_confirmed' ? new Date() : null
      ]);
    }

    await client.query('COMMIT');
    console.log('Seeded realistic operations data successfully:');
    console.log('- 15 certified technicians in photonix_auth.account');
    console.log('- 42 installation jobs across stages with real costs and profit');
    console.log('- Equipment serials with real warranty timelines');
    console.log('- 4 service tickets (in-warranty and out-of-warranty billing)');
    console.log('- 4 backend automation rules in photonix_ops.automation_rule');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Seed failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
