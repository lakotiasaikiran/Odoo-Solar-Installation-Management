import {readFile} from 'node:fs/promises';
import pg from 'pg';
const url=new URL(process.env.DATABASE_URL);
if(url.hostname!=='127.0.0.1'||url.pathname!=='/photonix_identity_dev')throw Error('Expected isolated Photonix development database');
const db=new pg.Client({connectionString:url.href});await db.connect();
try {
 await db.query(await readFile(new URL('./solarfit-schema.sql',import.meta.url),'utf8'));
 await db.query('GRANT USAGE ON SCHEMA photonix_solarfit TO photonix_api');
 await db.query('GRANT SELECT ON ALL TABLES IN SCHEMA photonix_solarfit TO photonix_api');
 await db.query('GRANT UPDATE (id) ON photonix_solarfit.catalog TO photonix_api');
 await db.query('GRANT UPDATE (lead_id) ON photonix_solarfit.approved_survey TO photonix_api');
 await db.query('GRANT INSERT ON photonix_solarfit.quote,photonix_solarfit.confirmed_order TO photonix_api');
 await db.query('GRANT UPDATE (reviewed_by,review_reason,accepted_at,acceptance_reference) ON photonix_solarfit.quote TO photonix_api');
} finally {await db.end();}
