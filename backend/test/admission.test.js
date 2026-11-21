import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import pg from 'pg';
import bcrypt from 'bcryptjs';
import { createApp } from '../app.js';

test('staff admission and access against PostgreSQL', async t => {
  const connectionString = process.env.TEST_DATABASE_URL;
  if (!connectionString) throw new Error('Set TEST_DATABASE_URL to a fresh disposable database or run test-local.ps1');
  const pool = new pg.Pool({connectionString});
  t.after(() => pool.end());
  const schema = await pool.query("SELECT to_regnamespace('photonix_auth') AS existing");
  assert.equal(schema.rows[0].existing,null,'Use an empty test database');
  await pool.query(await readFile(new URL('../schema.sql',import.meta.url),'utf8'));
  const server = createApp(pool,randomUUID()).listen(0,'127.0.0.1');
  await once(server,'listening');
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = 'http://127.0.0.1:' + server.address().port;
  const request = (path,body,token) => fetch(base+path, {method:body?'POST':'GET',headers:{
    ...(body && {'Content-Type':'application/json'}), ...(token && {Authorization:'Bearer '+token})},
    body:body?JSON.stringify(body):undefined});
  const password = randomUUID();
  const hash = await bcrypt.hash(password,12);
  for (const role of ['admin','verifier']) await pool.query(
    "INSERT INTO photonix_auth.account(id,email,password_hash,role,state) VALUES($1,$2,$3,$4,'active')",
    [randomUUID(),role+'@example.test',hash,role]);
  async function login(name) {
    const r = await request('/api/login',{ email:name+'@example.test',password });
    assert.equal(r.status,200);
    return (await r.json()).accessToken;
  }
  const admin = await login('admin'), verifier = await login('verifier');
  const apply = role => request('/api/staff/applications',{email:'worker@example.test',password,role});
  let id, worker;
  const decide = (token,decision) => request('/api/staff/applications/'+id+'/decisions',{decision,evidenceReference:'SYNTHETIC-CHECK-01'},token);
  await t.test('health, security headers and closed review queue',async()=>{
    const health=await request('/health');
    assert.equal(health.status,200); assert.equal(health.headers.get('x-content-type-options'),'nosniff');
    assert.equal((await request('/api/staff/applications')).status,401);
  });
  await t.test('privileged roles cannot be requested; pending accounts cannot sign in',async()=>{
    assert.equal((await apply('admin')).status,400);
    assert.equal((await apply('sales')).status,202); assert.equal((await apply('sales')).status,202);
    assert.equal((await request('/api/login',{email:'worker@example.test',password})).status,401);
    const queue = await (await request('/api/staff/applications',null,verifier)).json();
    assert.equal(queue.length,1); id=queue[0].id;
  });
  await t.test('verification precedes independent admission and retries preserve one decision',async()=>{
    assert.equal((await decide(admin,'admit')).status,409);
    assert.equal((await decide(verifier,'verify')).status,200);
    const reviewed = await (await request('/api/staff/applications',null,admin)).json();
    assert.equal(reviewed[0].verification_reference,'SYNTHETIC-CHECK-01');
    assert.equal(reviewed[0].id,id);
    assert.equal((await decide(verifier,'admit')).status,403);
    const results=await Promise.all([decide(admin,'admit'),decide(admin,'admit')]);
    assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);
    worker=await login('worker');
  });
  await t.test('staff sees sales workspace; review and suspension remain restricted',async()=>{
    const me=await (await request('/api/me',null,worker)).json(); assert.equal(me.workspace,'enquiries');
    assert.equal((await request('/api/staff/applications',null,worker)).status,403);
    assert.equal((await decide(worker,'suspend')).status,403);
    const adminIdentity = await (await request('/api/me',null,admin)).json();
    const selfReview = await request('/api/staff/applications/'+adminIdentity.id.toUpperCase()+'/decisions',
      {decision:'suspend',evidenceReference:'synthetic-review'},admin);
    assert.equal(selfReview.status,403);
    assert.equal((await decide(admin,'suspend')).status,200);
    assert.equal((await request('/api/me',null,worker)).status,401);
    const events=await pool.query('SELECT decision FROM photonix_auth.review_event ORDER BY id');
    assert.deepEqual(events.rows.map(r=>r.decision),['verify','admit','suspend']);
  });
});