// Exercises the real configured databases using two sales identities and an anonymous customer.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { once } from 'node:events';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { setTimeout as delay } from 'node:timers/promises';

const demo = JSON.parse(await readFile(process.env.PHOTONIX_DEMO_ACCOUNTS, 'utf8'));
const probe = createServer().listen(0, '127.0.0.1');
await once(probe, 'listening');
const port = String(probe.address().port);
await new Promise(resolve => probe.close(resolve));
const origin = 'http://127.0.0.1:' + port;
let child;
async function start() {
  child = spawn(process.execPath, ['server.js'], { cwd: new URL('../',import.meta.url), env: { ...process.env, PORT: port }, stdio: ['ignore','ignore','inherit'] });
  for (let attempt=0; attempt<100; attempt++) {
    if (child.exitCode !== null) throw new Error('Test API failed to start');
    try { if ((await fetch(origin+'/health')).ok) return; } catch {}
    await delay(100);
  }
  throw new Error('Test API readiness timed out');
}
async function stop() {
  if (!child || child.exitCode !== null || child.signalCode !== null) return;
  const exited=once(child,'exit');
  child.kill();
  await exited;
}
function api(path,body,token) {
  return fetch(origin+'/api'+path,{ method: body ? 'POST' : 'GET', headers: {
    ...(body && {'Content-Type':'application/json'}), ...(token && {Authorization:'Bearer '+token})
  },body:body && JSON.stringify(body) });
}
async function token(user) {
  const res=await api('/login',{email:user.email,password:user.password});
  assert.equal(res.status,200);
  return (await res.json()).accessToken;
}
const form={idempotencyKey:randomUUID(),customerName:'Sprint 0 demo homeowner',phone:'9000000000',address:'Demo site, Pune',requirement:'Synthetic 3 kW enquiry for acceptance testing'};
try {
  await start();
  assert.equal((await api('/enquiries',{...form,phone:'abc12345'})).status,400);
  const created=await api('/enquiries',form);
  assert.equal(created.status,201);
  const receipt=await created.json();
  assert.ok(receipt.reference); assert.ok(receipt.trackingCode);
  const sales=await token(demo.sales);
  async function findLead() {
    const res=await api('/enquiries',null,sales);
    assert.equal(res.status,200);
    const hits=(await res.json()).filter(item=>item.reference===receipt.reference);
    assert.equal(hits.length,1);
    assert.equal(hits[0].customerName,form.customerName);
    return hits[0];
  }
  const lead=await findLead();
  console.log('PASS: intake validates inputs, returns a private receipt and creates one assigned Odoo CRM lead');
  assert.equal((await api('/enquiries/'+lead.id,null,sales)).status,200);
  assert.equal((await api('/enquiries/'+lead.id)).status,401);
  const other=await token(demo.otherSales);
  const otherQueue=await api('/enquiries',null,other);
  assert.equal(otherQueue.status,200);
  assert.ok(!(await otherQueue.json()).some(item=>item.id===lead.id));
  assert.equal((await api('/enquiries/'+lead.id,null,other)).status,404);
  assert.equal((await api('/enquiries',null,await token(demo.verifier))).status,403);
  console.log('PASS: anonymous, wrong-role and unassigned identities cannot read the lead');
  await stop();
  await start();
  assert.equal((await findLead()).id,lead.id);
  const repeats=await Promise.all([api('/enquiries',form),api('/enquiries',form)]);
  for (const res of repeats) {
    assert.equal(res.status,201); assert.equal((await res.json()).reference,receipt.reference);
  }
  assert.equal((await api('/enquiries',{...form,customerName:'Different request'})).status,409);
  assert.equal((await findLead()).id,lead.id);
  console.log('PASS: restart, concurrent retries and changed-content conflict; one persisted lead: '+receipt.reference);
} finally { await stop(); }
