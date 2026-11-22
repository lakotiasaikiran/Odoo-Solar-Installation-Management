// Uses a fresh labelled synthetic installation on the local demo database.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import pg from 'pg';
const url=new URL(process.env.DATABASE_URL);
if(url.hostname!=='127.0.0.1'||url.pathname!=='/photonix_identity_dev')throw Error('Local demo database required');
const accounts=JSON.parse(await readFile(process.env.PHOTONIX_DEMO_ACCOUNTS,'utf8'));
const db=new pg.Client({connectionString:url.href});await db.connect();
async function api(path,token,body){
 return fetch('http://127.0.0.1:3200/api/'+path,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',...(token&&{Authorization:'Bearer '+token})},body:body&&JSON.stringify(body)});
}
async function login(account){const r=await api('login',null,{email:account.email,password:account.password});assert.equal(r.status,200);return(await r.json()).accessToken;}
try{
 const admin=await login(accounts.admin),sales=await login(accounts.sales);
 const number='DEMO-BILL-'+randomUUID().slice(0,8);
 const {rows:[job]}=await db.query("INSERT INTO photonix_ops.installation_job(job_number,customer_name,customer_phone,address,system_capacity_kw,scheduled_date,contract_amount) VALUES($1,'Billing demo homeowner','0000000000','Synthetic site',2,current_date,100000) RETURNING id",[number]);
 const base='finance/jobs/'+job.id;
 assert.equal((await api(base+'/invoice',sales,{})).status,403);
 const issue=await api(base+'/invoice',admin,{});assert.equal(issue.status,200);const invoice=await issue.json();
 assert.deepEqual(await(await api(base+'/invoice',admin,{})).json(),invoice);
 const pay={requestId:randomUUID(),method:'bank',amount:'25000.00'};
 const results=await Promise.all([api(base+'/payments',admin,pay),api(base+'/payments',admin,pay)]);
 assert.deepEqual(results.map(r=>r.status).sort(),[200,201]);
 assert.equal((await api(base+'/payments',admin,{...pay,requestId:randomUUID(),amount:'75000.01'})).status,409);
 const ledger=await(await api('finance/overview',admin)).json();
 const row=ledger.invoices.find(i=>i.id===job.id);
 assert.equal(row.balanceDue,75000);assert.equal(row.receipts.length,1);assert.equal(row.collected,25000);
 const dashboard=await(await api('director/overview',admin)).json();
 assert.equal(dashboard.outstandingInvoices,ledger.summary.outstanding);
 console.log(number,row.invoiceNumber,'PASS: repeat issue, concurrent duplicate payment, overpayment protection, role access, saved receipt and dashboard reconciliation');
}finally{await db.end();}
