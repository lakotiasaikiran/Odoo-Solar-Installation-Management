import pg from 'pg';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const accounts = [
  { role: 'director', email: 'director@photonix.example.test', pw: 'Photonix@Director2026' },
  { role: 'warehouse', email: 'warehouse@photonix.example.test', pw: 'Photonix@Warehouse2026' },
  { role: 'support', email: 'support@photonix.example.test', pw: 'Photonix@Support2026' }
];

for (const a of accounts) {
  const hash = await bcrypt.hash(a.pw, 12);
  await pool.query(
    `INSERT INTO photonix_auth.account (id, email, password_hash, role, state)
     VALUES ($1, $2, $3, $4, 'active')
     ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, state = 'active'`,
    [randomUUID(), a.email, hash, a.role]
  );
}
console.log('Director, Warehouse, and Support accounts configured successfully.');
await pool.end();
