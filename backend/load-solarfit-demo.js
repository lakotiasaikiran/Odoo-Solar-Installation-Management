import pg from 'pg';
import {packages,assumptions} from './solarfit-demo.js';
const url=new URL(process.env.DATABASE_URL);
if(url.hostname!=='127.0.0.1'||url.pathname!=='/photonix_identity_dev')throw Error('Local demo database required');
const db=new pg.Client({connectionString:url.href});await db.connect();
try{await db.query('INSERT INTO photonix_solarfit.catalog(packages,assumptions) VALUES($1,$2) ON CONFLICT(id) DO NOTHING',[JSON.stringify(packages),assumptions]);}finally{await db.end();}
