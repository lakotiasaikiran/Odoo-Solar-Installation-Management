import { readFile } from 'node:fs/promises';
import pg from 'pg';
import bcrypt from 'bcryptjs';

const url = new URL(process.env.DATABASE_URL);
if (url.hostname !== '127.0.0.1' || url.pathname !== '/photonix_identity_dev') {
  throw new Error('Synthetic fixtures require the isolated local identity development database');
}
const accounts = JSON.parse(await readFile(process.argv[2], 'utf8'));
const client = new pg.Client({connectionString: url.href});
await client.connect();
try {
  await client.query(await readFile(new URL('./schema.sql', import.meta.url), 'utf8'));
  await client.query('BEGIN');
  await client.query('LOCK TABLE photonix_auth.account IN SHARE ROW EXCLUSIVE MODE');
  for (const [name, account] of Object.entries(accounts)) {
    const role = name === 'otherSales' ? 'sales' : (name === 'reviewer' ? 'technical_reviewer' : name);
    const {rows: [existing]} = await client.query('SELECT id,email,role,password_hash FROM photonix_auth.account WHERE id=$1 OR email=$2',
      [account.id,account.email]);
    if (existing) {
      if (existing.id !== account.id || existing.email !== account.email || existing.role !== role ||
          !await bcrypt.compare(account.password,existing.password_hash)) {
        throw new Error('Existing demo account has different credentials; restore the matching local credential file.');
      }
      continue;
    }
    await client.query(`INSERT INTO photonix_auth.account (id,email,password_hash,role,state,verified_by)
      VALUES ($1,$2,$3,$4,'active',$5)`,
      [account.id, account.email, await bcrypt.hash(account.password,12), role, role !== 'admin' && role !== 'verifier' ? accounts.verifier.id : null]);
    if (['sales', 'surveyor', 'technical_reviewer'].includes(role)) {
      await client.query(`INSERT INTO photonix_auth.review_event(account_id,actor_id,decision,evidence_reference)
        VALUES ($1,$2,'verify','Synthetic Sprint 1 identity fixture'), ($1,$3,'admit','Synthetic Sprint 1 admission fixture')`,
        [account.id, accounts.verifier.id, accounts.admin.id]);
    }
  }
  const runtimeUrl = new URL(process.env.PHOTONIX_RUNTIME_DB);
  if (runtimeUrl.username !== 'photonix_api' || runtimeUrl.host !== url.host || runtimeUrl.pathname !== url.pathname) {
    throw new Error('Unexpected API runtime connection');
  }
  const role = await client.query("SELECT 1 FROM pg_roles WHERE rolname='photonix_api'");
  if (!role.rowCount) {
    const { rows } = await client.query("SELECT format('CREATE ROLE photonix_api LOGIN PASSWORD %L', $1::text) AS statement", [runtimeUrl.password]);
    await client.query(rows[0].statement);
  }
  await client.query(`
    GRANT CONNECT ON DATABASE photonix_identity_dev TO photonix_api;
    GRANT USAGE ON SCHEMA photonix_auth TO photonix_api;
    GRANT SELECT, INSERT ON photonix_auth.account TO photonix_api;
    GRANT UPDATE (state, verified_by, password_hash) ON photonix_auth.account TO photonix_api;
    GRANT SELECT, INSERT ON photonix_auth.review_event TO photonix_api;
    GRANT USAGE ON ALL SEQUENCES IN SCHEMA photonix_auth TO photonix_api;
  `);
  await client.query('COMMIT');
} catch (error) {
  await client.query('ROLLBACK');
  throw error;
} finally {
  await client.end();
}
