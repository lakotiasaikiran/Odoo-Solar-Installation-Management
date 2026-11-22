import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { createApp } from '../app.js';
import { customerRoutes, normalizePhone } from '../customer-routes.js';
import { createServer } from 'node:net';
import { once } from 'node:events';

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const secret = process.env.JWT_SECRET || 'a'.repeat(32);

// Mock CRM adapter with 2 separate customer leads
const testLeads = [
  {
    id: 101,
    reference: 'PX-000101',
    customerName: 'Aarav Sharma',
    phone: '9876543210',
    address: 'Plot 42, Baner Road, Pune',
    propertyType: 'residential',
    preliminaryCapacityKw: 3.0,
    qualificationState: 'qualified',
    surveyStatus: 'approved',
    quoteStatus: 'sent',
    quoteAmount: 102000,
    quoteDetails: {
      capacityKw: 3.0,
      panelCount: 6,
      grossPrice: 180000,
      estimatedSubsidy: 78000,
      netEffectiveCost: 102000
    }
  },
  {
    id: 102,
    reference: 'PX-000102',
    customerName: 'Vikram Singh',
    phone: '9123456789',
    address: 'Sector 5, Indore',
    propertyType: 'residential',
    preliminaryCapacityKw: 5.0,
    qualificationState: 'qualified',
    surveyStatus: 'approved',
    quoteStatus: 'sent',
    quoteAmount: 222000,
    quoteDetails: {
      capacityKw: 5.0,
      panelCount: 10,
      grossPrice: 300000,
      estimatedSubsidy: 78000,
      netEffectiveCost: 222000
    }
  }
];

const mockCrm = {
  async listEnquiries() {
    return testLeads;
  },
  async getEnquiry({ id }) {
    return testLeads.find(l => l.id === id);
  },
  async generateQuote({ id, quoteAmount, quoteDetails }) {
    const l = testLeads.find(lead => lead.id === id);
    if (l) {
      l.quoteStatus = 'accepted';
      l.quoteAmount = quoteAmount;
      l.quoteDetails = { ...(l.quoteDetails || {}), ...quoteDetails };
    }
    return l;
  }
};

const app = createApp(pool, secret, {
  mountEnquiries(app) {
    customerRoutes({ pool, crm: mockCrm })(app);
  }
});

const probe = createServer().listen(0, '127.0.0.1');
await once(probe, 'listening');
const port = probe.address().port;
probe.close();

const server = app.listen(port, '127.0.0.1');
await once(server, 'listening');
const origin = `http://127.0.0.1:${port}`;

function api(path, body, token) {
  return fetch(origin + '/api/customer' + path, {
    method: body ? 'POST' : 'GET',
    headers: {
      ...(body && { 'Content-Type': 'application/json' }),
      ...(token && { Authorization: 'Bearer ' + token })
    },
    body: body ? JSON.stringify(body) : undefined
  });
}

try {
  console.log('--- RUNNING CUSTOMER PORTAL & INVOICING ISOLATION TESTS ---\n');

  // Test 1: Register or Login Customer 1 (Aarav Sharma)
  console.log('Test 1: Customer 1 Authentication...');
  let loginRes = await api('/login', { phone: '9876543210', password: 'Photonix@123' });
  let token1;
  if (loginRes.status === 200) {
    token1 = (await loginRes.json()).token;
    console.log('PASS: Customer 1 logged in with Photonix@123.');
  } else {
    const regRes = await api('/register', {
      name: 'Aarav Sharma',
      phone: '9876543210',
      email: 'aarav@example.com',
      password: 'Photonix@123'
    });
    assert.equal(regRes.status, 201);
    token1 = (await regRes.json()).token;
    console.log('PASS: Customer 1 registered successfully.');
  }

  // Test 2: Login Customer 2 (Vikram Singh) using Reference Mode
  console.log('Test 2: Customer 2 Reference-based login...');
  const refLoginRes = await api('/login', {
    phone: '9123456789',
    reference: 'PX-000102'
  });
  assert.equal(refLoginRes.status, 200);
  const token2 = (await refLoginRes.json()).token;
  console.log('PASS: Customer 2 logged in using project reference PX-000102.');

  // Test 3: Customer 1 Profile
  console.log('Test 3: Customer 1 Profile check...');
  const profRes = await api('/me', null, token1);
  assert.equal(profRes.status, 200);
  const prof = await profRes.json();
  assert.equal(normalizePhone(prof.phone), '9876543210');
  console.log('PASS: Customer 1 profile correctly returned.');

  // Test 4: Customer 1 Projects List Isolation
  console.log('Test 4: Customer Projects list isolation...');
  const projRes1 = await api('/projects', null, token1);
  assert.equal(projRes1.status, 200);
  const proj1 = await projRes1.json();
  assert.equal(proj1.projects.length, 1);
  assert.equal(proj1.projects[0].reference, 'PX-000101');
  assert.equal(proj1.projects[0].customerName, 'Aarav Sharma');
  console.log('PASS: Customer 1 sees only their own project (PX-000101).');

  const projRes2 = await api('/projects', null, token2);
  assert.equal(projRes2.status, 200);
  const proj2 = await projRes2.json();
  assert.equal(proj2.projects.length, 1);
  assert.equal(proj2.projects[0].reference, 'PX-000102');
  assert.equal(proj2.projects[0].customerName, 'Vikram Singh');
  console.log('PASS: Customer 2 sees only their own project (PX-000102).');

  // Test 5: Customer 1 Downloads Quotation
  console.log('Test 5: Customer 1 Quotation Download...');
  const quoteRes1 = await api('/quotes/PX-000101', null, token1);
  assert.equal(quoteRes1.status, 200);
  const quoteDoc1 = await quoteRes1.json();
  assert.equal(quoteDoc1.reference, 'PX-000101');
  assert.equal(quoteDoc1.commercials.netCustomerInvestment, 102000);
  assert.ok(quoteDoc1.system.panelCount > 0);
  console.log(`PASS: Customer 1 quotation retrieved: INR ${quoteDoc1.commercials.netCustomerInvestment}`);

  // Test 6: STRICT ISOLATION NEGATIVE CHECK — Customer 2 attempts to view Customer 1's Quotation
  console.log('Test 6: Cross-customer Quotation access denial (Negative Check)...');
  const crossQuoteRes = await api('/quotes/PX-000101', null, token2);
  assert.equal(crossQuoteRes.status, 403, 'Cross-customer quotation access MUST return HTTP 403');
  console.log('PASS: Server strictly BLOCKED Customer 2 from accessing Customer 1 quotation (HTTP 403).');

  // Test 7: Customer 1 Creates 20% Advance Invoice
  console.log('Test 7: Customer 1 creates 20% Advance Invoice...');
  const invRes1 = await api('/invoices', { reference: 'PX-000101', milestone: 'advance_20' }, token1);
  assert.ok([200, 201].includes(invRes1.status));
  const invData1 = await invRes1.json();
  const invoice1 = invData1.invoice;
  assert.ok(invoice1.invoice_number.startsWith('PX-INV-2026-'));
  assert.equal(normalizePhone(invoice1.customer_phone), '9876543210');
  assert.equal(Number(invoice1.total_invoice_amount), 20400); // 20% of 102,000
  assert.equal(invoice1.status, 'unpaid');
  console.log(`PASS: Advance Invoice ${invoice1.invoice_number} created for INR ${invoice1.total_invoice_amount}.`);

  // Test 8: STRICT ISOLATION NEGATIVE CHECK — Customer 2 attempts to create invoice for Customer 1's project
  console.log('Test 8: Cross-customer Invoice Creation denial (Negative Check)...');
  const crossInvRes = await api('/invoices', { reference: 'PX-000101', milestone: 'advance_20' }, token2);
  assert.equal(crossInvRes.status, 403, 'Customer 2 MUST NOT be able to create invoice for Customer 1 project');
  console.log('PASS: Server strictly BLOCKED Customer 2 from creating an invoice for Customer 1 (HTTP 403).');

  // Test 9: Customer Invoices List Isolation
  console.log('Test 9: Invoice List Isolation...');
  const invListRes1 = await api('/invoices', null, token1);
  assert.equal(invListRes1.status, 200);
  const list1 = await invListRes1.json();
  assert.ok(list1.some(i => i.invoice_number === invoice1.invoice_number));

  const invListRes2 = await api('/invoices', null, token2);
  assert.equal(invListRes2.status, 200);
  const list2 = await invListRes2.json();
  assert.ok(!list2.some(i => i.invoice_number === invoice1.invoice_number), 'Customer 2 MUST NOT see Customer 1 invoice');
  console.log('PASS: Customer 1 invoice is completely invisible in Customer 2 invoices list.');

  // Test 10: Customer 2 attempts to fetch Customer 1's invoice directly by UUID
  console.log('Test 10: Direct Invoice ID access denial (Negative Check)...');
  const directReadRes = await api(`/invoices/${invoice1.id}`, null, token2);
  assert.equal(directReadRes.status, 403, 'Customer 2 direct read of Customer 1 invoice MUST return 403');
  console.log('PASS: Direct invoice fetch by another customer returned HTTP 403.');

  // Test 11: Customer 1 Records Milestone Payment
  console.log('Test 11: Milestone Payment confirmation...');
  const payRes = await api(`/invoices/${invoice1.id}/pay`, { method: 'upi', reference: 'UPI/TEST/12345' }, token1);
  assert.equal(payRes.status, 200);
  const payData = await payRes.json();
  assert.equal(payData.invoice.status, 'paid');
  assert.equal(payData.invoice.payment_method, 'upi');
  console.log('PASS: Invoice marked as paid with recorded UPI transaction reference.');

  console.log('\nALL 11 CUSTOMER AUTHENTICATION & ISOLATION TESTS PASSED PERFECTLY!\n');
} finally {
  server.close();
  await pool.end();
}
