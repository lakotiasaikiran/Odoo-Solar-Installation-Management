import pg from 'pg';

if (!process.env.DATABASE_URL) {
  console.log('No DATABASE_URL');
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const { rows } = await pool.query(
  "SELECT table_schema, table_name FROM information_schema.tables WHERE table_schema LIKE 'photonix%' ORDER BY table_schema, table_name"
);
console.log(JSON.stringify(rows, null, 2));
await pool.end();
