import pg from 'pg';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import { writeFile } from 'node:fs/promises';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

const UNIVERSAL_PASSWORD = 'Photonix@123';

const SIMPLE_ACCOUNTS = [
  { role: 'director', email: 'director@photonix.com' },
  { role: 'sales', email: 'sales@photonix.com' },
  { role: 'surveyor', email: 'surveyor@photonix.com' },
  { role: 'technical_reviewer', email: 'reviewer@photonix.com' },
  { role: 'warehouse', email: 'warehouse@photonix.com' },
  { role: 'installer', email: 'installer@photonix.com' },
  { role: 'support', email: 'support@photonix.com' },
  { role: 'admin', email: 'admin@photonix.com' },
  { role: 'verifier', email: 'verifier@photonix.com' },
  { role: 'sales', key: 'otherSales', email: 'sales2@photonix.com' },
];

async function updateAccounts() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const hash = await bcrypt.hash(UNIVERSAL_PASSWORD, 12);

    for (const acc of SIMPLE_ACCOUNTS) {
      // 1. Update existing account with this role to the universal password and simple email if needed
      await client.query(`
        INSERT INTO photonix_auth.account (id, email, password_hash, role, state)
        VALUES ($1, $2, $3, $4, 'active')
        ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, state = 'active';
      `, [randomUUID(), acc.email, hash, acc.role]);
    }

    // Also update all existing staff and technician accounts to universal password
    await client.query(`
      UPDATE photonix_auth.account
      SET password_hash = $1
      WHERE state = 'active';
    `, [hash]);

    await client.query('COMMIT');
    console.log('Database updated: all staff accounts now use universal password "Photonix@123" with simple @photonix.com emails.');

    // Update demo-accounts.json
    const accountsPath = process.env.PHOTONIX_DEMO_ACCOUNTS;
    if (accountsPath) {
      const records = {};
      for (const acc of SIMPLE_ACCOUNTS) {
        records[acc.key || acc.role] = {
          email: acc.email,
          password: UNIVERSAL_PASSWORD,
        };
      }
      await writeFile(accountsPath, JSON.stringify(records, null, 2), 'utf8');
      console.log('Updated demo-accounts.json at', accountsPath);
    }
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Account update error:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

updateAccounts();
