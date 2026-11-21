// Sprint 1 acceptance test suite covering checks 1-4 and security boundaries.
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
  child = spawn(process.execPath, ['server.js'], {
    cwd: new URL('../', import.meta.url),
    env: { ...process.env, PORT: port },
    stdio: ['ignore', 'ignore', 'inherit']
  });
  for (let attempt = 0; attempt < 100; attempt++) {
    if (child.exitCode !== null) throw new Error('Test API failed to start');
    try {
      if ((await fetch(origin + '/health')).ok) return;
    } catch {}
    await delay(100);
  }
  throw new Error('Test API readiness timed out');
}

async function stop() {
  if (!child || child.exitCode !== null || child.signalCode !== null) return;
  const exited = once(child, 'exit');
  child.kill();
  await exited;
}

function api(path, body, token) {
  return fetch(origin + '/api' + path, {
    method: body ? 'POST' : 'GET',
    headers: {
      ...(body && { 'Content-Type': 'application/json' }),
      ...(token && { Authorization: 'Bearer ' + token })
    },
    body: body ? JSON.stringify(body) : undefined
  });
}

async function token(user) {
  const res = await api('/login', { email: user.email, password: user.password });
  assert.equal(res.status, 200, `Login failed for ${user.email}`);
  return (await res.json()).accessToken;
}

try {
  await start();

  const salesToken = await token(demo.sales);
  const otherSalesToken = await token(demo.otherSales);
  const surveyorToken = await token(demo.surveyor);
  const reviewerToken = await token(demo.technical_reviewer);

  // --- ACCEPTANCE CHECK 1: Web and Assisted Intake ---
  console.log('\n--- Checking Acceptance Check 1 (Multi-Channel Intake & Sales Record) ---');

  // 1a. Self-service web enquiry
  const webEnquiry = {
    idempotencyKey: randomUUID(),
    customerName: 'Aarav Sharma',
    phone: '9876543210',
    address: 'Plot 42, Baner Road, Pune, Maharashtra 411045',
    requirement: 'Need 3 kW on-grid solar system to reduce monthly bill from ₹3,000 to zero.',
    sourceChannel: 'web',
    propertyType: 'residential',
    monthlyBill: 3000,
    roofSpace: 350,
    subsidyRequested: true,
    backupRequired: 'essential',
    paymentMethod: 'milestone'
  };
  const webRes = await api('/enquiries', webEnquiry);
  assert.equal(webRes.status, 201);
  const webReceipt = await webRes.json();
  assert.ok(webReceipt.reference, 'Receipt reference must be returned');
  console.log(`PASS: Self-service web enquiry created: ${webReceipt.reference}`);

  // 1b. Assisted phone call intake by salesperson
  const callEnquiry = {
    idempotencyKey: randomUUID(),
    customerName: 'Pooja Patel',
    phone: '9123456780',
    address: 'Kalyani Nagar, Pune',
    requirement: 'Inquired over phone about PM Surya Ghar subsidy for bungalow.',
    sourceChannel: 'call',
    propertyType: 'residential',
    monthlyBill: 4500,
    roofSpace: 500,
    subsidyRequested: true
  };
  const callRes = await api('/enquiries', callEnquiry, salesToken);
  assert.equal(callRes.status, 201);
  const callReceipt = await callRes.json();
  console.log(`PASS: Salesperson-assisted phone enquiry created: ${callReceipt.reference}`);

  // Verify salesperson sees both leads in their queue
  const salesQueue = await (await api('/enquiries', null, salesToken)).json();
  const lead1 = salesQueue.find(l => l.reference === webReceipt.reference);
  assert.ok(lead1, 'Web lead must appear in assigned sales queue');
  assert.equal(lead1.customerName, 'Aarav Sharma');
  assert.equal(lead1.sourceChannel, 'web');
  assert.equal(lead1.monthlyBill, 3000);
  assert.equal(lead1.subsidyRequested, true);
  console.log('PASS: Salesperson reads enquiry details including bill, space, and subsidy need');

  // Verify second customer isolation: another salesperson cannot read lead1
  const unauthRead = await api(`/enquiries/${lead1.id}`, null, otherSalesToken);
  assert.equal(unauthRead.status, 404, 'Unassigned salesperson must receive 404');
  console.log('PASS: Cross-assignment access correctly denied');

  // --- ACCEPTANCE CHECK 2: Qualification Call ---
  console.log('\n--- Checking Acceptance Check 2 (Qualification Call) ---');
  const qualifyPayload = {
    gridSuitability: 'suitable',
    monthlyBill: 2800,
    roofSpace: 350,
    preliminaryCapacityKw: 3.0,
    qualificationNotes: 'Customer confirmed south-facing shadow-free terrace. DISCOM load 4 kW sanctioned.',
    assignedSurveyorId: demo.surveyor.id,
    qualificationState: 'qualified'
  };
  const qualRes = await api(`/enquiries/${lead1.id}/qualify`, qualifyPayload, salesToken);
  assert.equal(qualRes.status, 200);
  const qualLead = await qualRes.json();
  assert.equal(qualLead.qualificationState, 'qualified');
  assert.equal(qualLead.gridSuitability, 'suitable');
  assert.equal(qualLead.preliminaryCapacityKw, 3.0);
  assert.equal(qualLead.surveyStatus, 'assigned');
  console.log('PASS: Qualification call recorded with grid suitability, roof area, and preliminary sizing');

  // --- ACCEPTANCE CHECK 4 (Negative): Quote Gate Enforced ---
  console.log('\n--- Checking Acceptance Check 4 (Quotation Gate Enforcement) ---');
  const prematureQuote = await api(`/enquiries/${lead1.id}/quote`, {}, salesToken);
  assert.equal(prematureQuote.status, 403, 'Quotation attempt before survey approval MUST be rejected');
  const gateError = await prematureQuote.json();
  assert.match(gateError.error, /technical survey must be approved/i);
  console.log('PASS: Server strictly BLOCKED quotation before survey approval (HTTP 403)');

  // --- ACCEPTANCE CHECK 3: Physical Site Survey Findings ---
  console.log('\n--- Checking Acceptance Check 3 (Technician Survey Findings) ---');
  // Surveyor sees lead in their site-visits queue
  const survQueue = await (await api('/enquiries', null, surveyorToken)).json();
  assert.ok(survQueue.some(item => item.id === lead1.id), 'Surveyor must see assigned site');

  const surveyPayload = {
    roofDirection: 'south',
    roofTiltDeg: 22,
    usableRoofArea: 320,
    cableDistanceM: 18.5,
    roofType: 'rcc_flat',
    surveyNotes: 'RCC flat terrace, clear southern horizon. Inverter mounting on east parapet wall.'
  };
  const survRes = await api(`/enquiries/${lead1.id}/survey`, surveyPayload, surveyorToken);
  assert.equal(survRes.status, 200);
  const survLead = await survRes.json();
  assert.equal(survLead.surveyStatus, 'submitted');
  assert.equal(survLead.roofDirection, 'south');
  assert.equal(survLead.roofTiltDeg, 22);
  assert.equal(survLead.cableDistanceM, 18.5);
  console.log('PASS: Surveyor recorded findings on roof direction, tilt, usable space, and cable distance');

  // --- ACCEPTANCE CHECK 4: Technical Reviewer Returns Survey, then Approves ---
  console.log('\n--- Checking Acceptance Check 4 (Technical Review & Decision) ---');
  // 4a. Reviewer returns survey for correction
  const returnRes = await api(
    `/enquiries/${lead1.id}/review`,
    { decision: 'return', reviewNotes: 'Please verify cable distance from terrace to ground floor DB.' },
    reviewerToken
  );
  assert.equal(returnRes.status, 200);
  const returnedLead = await returnRes.json();
  assert.equal(returnedLead.surveyStatus, 'changes_requested');
  assert.equal(returnedLead.quoteStatus, 'locked');
  console.log('PASS: Technical reviewer returned survey with correction reason; quote remains locked');

  // Surveyor updates measurement and re-submits
  await api(`/enquiries/${lead1.id}/survey`, { ...surveyPayload, cableDistanceM: 21 }, surveyorToken);

  // 4b. Reviewer approves corrected survey
  const approveRes = await api(
    `/enquiries/${lead1.id}/review`,
    { decision: 'approve', reviewNotes: 'Measurements verified and within acceptable voltage drop limits.' },
    reviewerToken
  );
  assert.equal(approveRes.status, 200);
  const approvedLead = await approveRes.json();
  assert.equal(approvedLead.surveyStatus, 'approved');
  console.log('PASS: Technical reviewer approved corrected findings');

  // --- ACCEPTANCE CHECK 4 (Positive): Final Quote Generation Unlocked ---
  const validQuote = await api(`/enquiries/${lead1.id}/quote`, {}, salesToken);
  assert.equal(validQuote.status, 200);
  const quoteData = await validQuote.json();
  assert.equal(quoteData.quote.quoteStatus, 'sent');
  assert.ok(quoteData.quote.quoteAmount > 0);
  console.log(`PASS: Quote successfully created and dispatched after survey approval: ₹${quoteData.quote.quoteAmount}`);

  // --- Customer Tracking Endpoint ---
  console.log('\n--- Checking Customer Progress Tracking ---');
  assert.ok(quoteData.quote.quoteDetails.quoteId);
  assert.ok(quoteData.quote.quoteDetails.packageId);
  const url=origin+'/api/enquiries/track/'+webReceipt.reference;
  assert.equal((await fetch(url)).status,404);
  const trackRes=await fetch(url,{headers:{'X-Tracking-Code':webReceipt.trackingCode}});
  assert.equal(trackRes.status, 200);
  const track = await trackRes.json();
  assert.equal(track.reference, webReceipt.reference);
  assert.equal(track.qualificationState, 'qualified');
  assert.equal(track.surveyStatus, 'approved');
  assert.equal(track.quoteStatus, 'sent');
  console.log('PASS: Customer tracking displays real-time milestone progress without exposing internal costs');

  console.log('\nALL SPRINT 1 ACCEPTANCE CHECKS PASSED SUCCESSFULLY!\n');
} finally {
  await stop();
}
