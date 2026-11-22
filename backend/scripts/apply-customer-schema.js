import { readFile } from 'node:fs/promises';
import pg from 'pg';

// Read cluster.env if available, or fall back to DATABASE_URL
let dbUrl = process.env.DATABASE_URL;
try {
  const clusterEnv = await readFile(`${process.env.LOCALAPPDATA}/Photonix/identity-dev/cluster.env`, 'utf8');
  const line = clusterEnv.split(/[\r\n]+/).find(l => l.startsWith('DATABASE_URL='));
  if (line) dbUrl = line.slice('DATABASE_URL='.length).trim();
} catch {}

const client = new pg.Client({ connectionString: dbUrl });
await client.connect();
try {
  const schemaSql = await readFile(new URL('../customer-schema.sql', import.meta.url), 'utf8');
  await client.query(schemaSql);
  console.log('Customer schema and tables applied successfully.');
} catch (err) {
  console.error('Failed to apply customer schema:', err);
  process.exit(1);
} finally {
  await client.end();
}
