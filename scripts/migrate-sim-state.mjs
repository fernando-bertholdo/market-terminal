import fs from 'node:fs';
import path from 'node:path';
import { neon } from '@neondatabase/serverless';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL is required');
}

const statePath = path.join(process.cwd(), 'data', 'sim-state.json');
if (!fs.existsSync(statePath)) {
  throw new Error(`Local simulator state not found at ${statePath}`);
}

const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
const sql = neon(databaseUrl);

await sql`
  CREATE TABLE IF NOT EXISTS sim_state (
    id text PRIMARY KEY,
    state jsonb NOT NULL,
    version bigint NOT NULL DEFAULT 1,
    updated_at timestamptz NOT NULL DEFAULT now()
  )
`;

const existing = await sql`
  SELECT version, updated_at
  FROM sim_state
  WHERE id = 'paper-book'
`;

if (existing.length > 0 && !process.argv.includes('--force')) {
  throw new Error(
    `Cloud state already exists (version ${existing[0].version}, updated ${existing[0].updated_at}). ` +
    'Run with --force only if you intentionally want to replace it.'
  );
}

await sql`
  INSERT INTO sim_state (id, state, version, updated_at)
  VALUES ('paper-book', ${JSON.stringify(state)}::jsonb, 1, now())
  ON CONFLICT (id) DO UPDATE
  SET state = EXCLUDED.state,
      version = sim_state.version + 1,
      updated_at = now()
`;

console.log(
  `Migrated ${Object.keys(state.positions ?? {}).length} positions and ` +
  `${state.trades?.length ?? 0} trades to Postgres.`
);
