import { mountSolarFit } from './solarfit-routes.js';
import { enquiryRoutes } from './enquiries.js';
import { operationsRoutes } from './operations-routes.js';
import { createOdooAdapter } from './odoo.js';
import pg from 'pg';
import { createApp } from './app.js';

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const crm = createOdooAdapter(process.env);
const app = createApp(pool, process.env.JWT_SECRET, {
  mountEnquiries(app, authenticate) {
    enquiryRoutes({ pool, crm, salesId: process.env.PHOTONIX_SALES_ID })(app, authenticate);
    mountSolarFit(app, authenticate, pool, crm);
    operationsRoutes({ pool })(app, authenticate);
  }
});
await pool.query('SELECT id FROM photonix_auth.account LIMIT 0');
const server = app.listen(Number(process.env.PORT ?? 3100), '127.0.0.1', () =>
  console.log('Photonix API listening on', server.address().port)
);
