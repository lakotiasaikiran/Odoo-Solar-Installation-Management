import pg from 'pg';
const url=new URL(process.env.DATABASE_URL);
if(url.hostname!=='127.0.0.1'||url.pathname!=='/photonix_identity_dev')throw Error('Local demo database required');
const db=new pg.Client({connectionString:url.href});
await db.connect();
try{
 await db.query(`INSERT INTO photonix_ops.installation_job(job_number,customer_name,customer_phone,address,system_capacity_kw,scheduled_date,status,contract_amount,equipment_cost,labour_cost,created_at)
 SELECT 'DEMO-HOME-'||n,'Demo household '||n,'000000'||lpad(n::text,4,'0'),'Demo rooftop '||n,1+n%5,current_date+(n%20)-10,
 (ARRAY['completed','scheduled','in_progress','blocked'])[1+n%4],60000*(1+n%5),40000*(1+n%5),5500*(1+n%5),now()-make_interval(days=>n%60)
 FROM generate_series(1,250) n ON CONFLICT(job_number) DO NOTHING`);
 console.log((await db.query("SELECT count(DISTINCT customer_name) AS demo_customers FROM photonix_ops.installation_job WHERE job_number LIKE 'DEMO-HOME-%'")).rows[0]);
}finally{await db.end()}
