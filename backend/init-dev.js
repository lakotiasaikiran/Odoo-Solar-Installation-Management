import pg from 'pg';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';

// Run locally with a dedicated identity database and two trusted staff accounts.
const url = process.env.DATABASE_URL;
if (!url) throw new Error('Set DATABASE_URL');
const target = new URL(url);
if (!['127.0.0.1','localhost','[::1]'].includes(target.hostname) || target.pathname !== '/photonix_identity_dev')
  throw new Error('Use the local photonix_identity_dev database');
const users = ['admin','verifier'].map(role => {
  const prefix = 'BOOTSTRAP_' + role.toUpperCase();
  const email = process.env[prefix + '_EMAIL']?.trim().toLowerCase();
  const password = process.env[prefix + '_PASSWORD'];
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !password || password.length < 12 || Buffer.byteLength(password)>72)
    throw new Error('Set a valid email and a distinct strong password for '+role);
  return {role,email,password};
});
if (users[0].email===users[1].email || users[0].password===users[1].password) throw new Error('Use separate bootstrap identities and passwords');
const db = new pg.Client({connectionString:url});
await db.connect();
try {
  await db.query(await readFile(new URL('./schema.sql',import.meta.url),'utf8'));
  await db.query('BEGIN');
  await db.query('LOCK TABLE photonix_auth.account IN SHARE ROW EXCLUSIVE MODE');
  if ((await db.query('SELECT 1 FROM photonix_auth.account LIMIT 1')).rowCount) throw new Error('Bootstrap requires an empty identity database');
  for (const {role,email,password} of users)
    await db.query("INSERT INTO photonix_auth.account(id,email,password_hash,role,state) VALUES($1,$2,$3,$4,'active')",
      [randomUUID(),email,await bcrypt.hash(password,12),role]);
  await db.query('COMMIT');
  console.log('Created development verifier and administrator');
} catch (error) { await db.query('ROLLBACK'); throw error; }
finally { await db.end(); }