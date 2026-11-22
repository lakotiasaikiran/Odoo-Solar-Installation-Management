import express from 'express';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';

export const staffRoles = ['sales','surveyor','buyer','warehouse','installer','dispatcher','support','finance','manager','director','subsidy','technical_reviewer','service_technician'];
const queues = { admin: 'admissions', verifier: 'identity-checks', sales: 'enquiries', surveyor: 'site-visits', buyer: 'suppliers', warehouse: 'packing', installer: 'installations', dispatcher: 'schedule', support: 'complaints', finance: 'receipts', manager: 'quote-exceptions', director: 'job-performance', subsidy: 'subsidy-cases', technical_reviewer: 'survey-approvals', service_technician: 'repairs' };
const tables = 'photonix_auth.account';
const tokenOptions = { issuer: 'photonix', audience: 'photonix-web' };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function createApp(pool, secret, options = {}) {
  if (typeof secret !== 'string' || Buffer.byteLength(secret) < 32) throw new Error('Configure a random JWT_SECRET of at least 32 bytes');
  const app = express();
  const dummyHash = bcrypt.hashSync(randomUUID(), 12);
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(express.json({ limit: '8kb' }));
  app.use('/api', (_req,res,next) => { res.set('Cache-Control','no-store'); next(); });
  const limiter = rateLimit({ windowMs: 15 * 60_000, limit: 30, standardHeaders: 'draft-7', legacyHeaders: false });
  app.get('/health', async (_req,res) => {
    await pool.query('SELECT id FROM photonix_auth.account LIMIT 0');
    res.json({ status: 'ready' });
  });
  app.post('/api/staff/applications', limiter, async (req,res) => {
    const { email, password, role } = req.body ?? {};
    if (typeof email !== 'string' || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ||
        typeof password !== 'string' || password.length < 12 || Buffer.byteLength(password) > 72 || !staffRoles.includes(role))
      return res.status(400).json({ error: 'Invalid staff application' });
    const hash = await bcrypt.hash(password,12);
    await pool.query(`INSERT INTO ${tables}(id,email,password_hash,role,state) VALUES ($1,$2,$3,$4,'pending') ON CONFLICT(email) DO NOTHING`,
      [randomUUID(), email.trim().toLowerCase(), hash, role]);
    res.status(202).json({ message: 'Application received for review' });
  });
  app.post('/api/login', limiter, async (req,res) => {
    const { email, password } = req.body ?? {};
    if (typeof email !== 'string' || typeof password !== 'string' || Buffer.byteLength(password) > 72)
      return res.sendStatus(401);
    const { rows: [user] } = await pool.query(`SELECT * FROM ${tables} WHERE email=$1`, [email.trim().toLowerCase()]);
    const valid = await bcrypt.compare(password,user?.password_hash ?? dummyHash);
    if (!valid || user?.state !== 'active') return res.sendStatus(401);
    res.json({ accessToken: jwt.sign({}, secret, { ...tokenOptions, algorithm: 'HS256', subject: user.id, expiresIn: '15m' }) });
  });
  async function authenticate(req,res,next) {
    let id;
    try {
      const token = /^Bearer (\S+)$/.exec(req.get('authorization') ?? '')?.[1];
      id = jwt.verify(token, secret, { ...tokenOptions, algorithms: ['HS256'] }).sub;
      if (!uuid.test(id)) return res.sendStatus(401);
    } catch { return res.sendStatus(401); }
    const { rows: [user] } = await pool.query(`SELECT id,role,email,state,created_at FROM ${tables} WHERE id=$1 AND state='active'`,[id]);
    if (!user) return res.sendStatus(401);
    req.actor = user;
    next();
  }

  options.mountEnquiries?.(app, authenticate);
  app.use('/api', authenticate);
  app.get('/api/me', (req,res) => res.json({ ...req.actor, workspace: queues[req.actor.role] }));
  app.post('/api/me/change-password', async (req, res) => {
    const { currentPassword, newPassword } = req.body ?? {};
    if (!currentPassword || !newPassword || newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters long.' });
    }
    const { rows: [account] } = await pool.query(`SELECT password_hash FROM ${tables} WHERE id=$1`, [req.actor.id]);
    const valid = await bcrypt.compare(currentPassword, account?.password_hash ?? '');
    if (!valid) return res.status(400).json({ error: 'Current password is incorrect.' });

    const newHash = await bcrypt.hash(newPassword, 12);
    await pool.query(`UPDATE ${tables} SET password_hash=$1 WHERE id=$2`, [newHash, req.actor.id]);
    res.json({ message: 'Password updated successfully.' });
  });
  app.get('/api/staff/applications', async (req,res) => {
    const state = { admin: 'verified', verifier: 'pending' }[req.actor.role];
    if (!state) return res.sendStatus(403);
    const { rows } = await pool.query(`SELECT a.id,a.email,a.role,a.state,a.verified_by,
      e.evidence_reference AS verification_reference,e.recorded_at AS verified_at
      FROM ${tables} a LEFT JOIN photonix_auth.review_event e
      ON e.account_id=a.id AND e.decision='verify'
      WHERE a.state=$1 ORDER BY a.created_at,a.id`,[state]);
    res.json(rows);
  });
  app.post('/api/staff/applications/:id/decisions', async (req,res) => {
    const id = req.params.id.toLowerCase();
    const { decision, evidenceReference } = req.body ?? {};
    const policy = new Map([
      ['verify',['verifier','pending','verified']], ['admit',['admin','verified','active']],
      ['reject',req.actor.role === 'verifier' ? ['verifier','pending','rejected'] : ['admin','verified','rejected']],
      ['suspend',['admin','active','suspended']]
    ]).get(decision);
    if (!policy || req.actor.role !== policy[0] || id === req.actor.id) return res.sendStatus(403);
    if (!uuid.test(id) || typeof evidenceReference !== 'string' || !evidenceReference.trim() || evidenceReference.length > 240)
      return res.sendStatus(400);
    const db = await pool.connect();
    try {
      await db.query('BEGIN');
      // Serialize competing reviews and staff suspension in a stable lock order.
      const accounts = await db.query(
        'SELECT id, role, state FROM photonix_auth.account WHERE id = ANY($1::uuid[]) ORDER BY id FOR UPDATE',
        [[req.actor.id, id]]
      );
      const reviewer = accounts.rows.find(account => account.id === req.actor.id);
      if (reviewer?.state !== 'active' || reviewer.role !== policy[0]) {
        await db.query('ROLLBACK');
        return res.sendStatus(403);
      }
      const result = await db.query(`UPDATE ${tables} SET state=$1, verified_by=CASE WHEN $2='verify' THEN $3::uuid ELSE verified_by END
        WHERE id=$4 AND state=$5 AND ($2 <> 'admit' OR verified_by <> $3::uuid) RETURNING id,state`,
        [policy[2],decision,req.actor.id,id,policy[1]]);
      if (!result.rowCount) {
        await db.query('ROLLBACK');
        return res.sendStatus(409);
      }
      await db.query('INSERT INTO photonix_auth.review_event(account_id,actor_id,decision,evidence_reference) VALUES ($1,$2,$3,$4)',
        [id,req.actor.id,decision,evidenceReference.trim()]);
      await db.query('COMMIT');
      res.json(result.rows[0]);
    } catch (error) { await db.query('ROLLBACK'); throw error; }
    finally { db.release(); }
  });
  app.use((err,_req,res,_next) => {
    const status = [400,413].includes(err.status) ? err.status : 500;
    res.status(status).json({ error: status === 500 ? 'Request could not be completed' : 'Invalid request body' });
  });
  return app;
}