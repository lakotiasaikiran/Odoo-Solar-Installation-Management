import { mountSolarFit } from './solarfit-routes.js';
import { enquiryRoutes } from './enquiries.js';
import { operationsRoutes } from './operations-routes.js';
import { customerRoutes } from './customer-routes.js';
import { createOdooAdapter } from './odoo.js';
import pg from 'pg';
import { readFile } from 'node:fs/promises';
import { createApp } from './app.js';

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const crm = (process.env.CRM_MODE === 'disabled' || (process.env.RENDER && !process.env.ODOO_BASE_URL)) ? null : createOdooAdapter(process.env);
const app = createApp(pool, process.env.JWT_SECRET, {
  mountEnquiries(app, authenticate) {
    if (crm) {
      enquiryRoutes({ pool, crm, salesId: process.env.PHOTONIX_SALES_ID })(app, authenticate);
      mountSolarFit(app, authenticate, pool, crm);
    } else {
      const unavailable = (_req,res) => res.status(503).json({error:'This workflow requires an Odoo CRM connection.'});
      app.use(['/api/enquiries','/api/solarfit','/api/customer/projects','/api/customer/quotes'], unavailable);
      app.post(['/api/customer/register','/api/customer/invoices'], unavailable);
      app.post('/api/customer/login',(req,res,next)=>req.body?.reference ? unavailable(req,res) : next());
    }
    customerRoutes({ pool, crm })(app);
    operationsRoutes({ pool })(app, authenticate);

  }
});
if (process.env.RENDER) {
  const fresh = await pool.query("SELECT to_regclass('photonix_auth.account') AS account");
  if (!fresh.rows[0].account) {
    for (const file of ['schema.sql', 'ops-schema.sql', 'solarfit-schema.sql', 'invoice-schema.sql', 'customer-schema.sql']) {
      const ddl = await readFile(new URL(file, import.meta.url), 'utf8');
      // The managed database owner already owns these tables. Local-role grants apply only in development.
      await pool.query(ddl.replace(/^GRANT [^;]+;/gm, ''));
    }
  }
}
await pool.query('SELECT id FROM photonix_auth.account LIMIT 0');
const server = app.listen(Number(process.env.PORT ?? 3100), process.env.HOST || (process.env.RENDER ? '0.0.0.0' : '127.0.0.1'), () =>
  console.log('Photonix API listening on', server.address().port)
);
