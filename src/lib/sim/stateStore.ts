import fs from 'fs';
import path from 'path';
import { neon } from '@neondatabase/serverless';
import { migrateSimState, newSimState, type SimState } from './engine';

const STATE_DIR = path.join(process.cwd(), 'data');
const STATE_FILE = path.join(STATE_DIR, 'sim-state.json');
const STATE_ID = 'paper-book';

export interface StoredSimState {
  state: SimState;
  version: number;
  backend: 'file' | 'postgres';
}

let schemaReady: Promise<void> | null = null;

function databaseUrl(): string | null {
  return process.env.DATABASE_URL?.trim() || null;
}

function postgres() {
  const url = databaseUrl();
  return url ? neon(url) : null;
}

async function ensureSchema(): Promise<void> {
  const sql = postgres();
  if (!sql) return;
  schemaReady ??= (async () => {
    await sql`
      CREATE TABLE IF NOT EXISTS sim_state (
        id text PRIMARY KEY,
        state jsonb NOT NULL,
        version bigint NOT NULL DEFAULT 1,
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `;
  })();
  return schemaReady;
}

function loadFileState(): StoredSimState {
  try {
    if (fs.existsSync(STATE_FILE)) {
      const state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8')) as SimState;
      return { state: migrateSimState(state), version: 0, backend: 'file' };
    }
  } catch (error) {
    console.error('[Sim] Could not read local state:', error);
  }
  return { state: newSimState(), version: 0, backend: 'file' };
}

function saveFileState(state: SimState): void {
  if (!fs.existsSync(STATE_DIR)) fs.mkdirSync(STATE_DIR, { recursive: true });
  const tempFile = `${STATE_FILE}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tempFile, JSON.stringify(state, null, 2), 'utf-8');
  fs.renameSync(tempFile, STATE_FILE);
}

export async function loadSimState(): Promise<StoredSimState> {
  const sql = postgres();
  if (!sql) return loadFileState();

  await ensureSchema();
  const rows = await sql`
    SELECT state, version
    FROM sim_state
    WHERE id = ${STATE_ID}
  `;
  if (rows.length > 0) {
    return {
      state: migrateSimState(rows[0].state as SimState),
      version: Number(rows[0].version),
      backend: 'postgres',
    };
  }

  const initial = loadFileState().state;
  const inserted = await sql`
    INSERT INTO sim_state (id, state, version)
    VALUES (${STATE_ID}, ${JSON.stringify(initial)}::jsonb, 1)
    ON CONFLICT (id) DO NOTHING
    RETURNING version
  `;
  if (inserted.length > 0) {
    return { state: initial, version: 1, backend: 'postgres' };
  }
  return loadSimState();
}

export async function saveSimState(
  state: SimState,
  expectedVersion: number
): Promise<number | null> {
  const sql = postgres();
  if (!sql) {
    saveFileState(state);
    return 0;
  }

  await ensureSchema();
  const rows = await sql`
    UPDATE sim_state
    SET state = ${JSON.stringify(state)}::jsonb,
        version = version + 1,
        updated_at = now()
    WHERE id = ${STATE_ID}
      AND version = ${expectedVersion}
    RETURNING version
  `;
  return rows.length > 0 ? Number(rows[0].version) : null;
}

export async function resetSimState(): Promise<StoredSimState> {
  const current = await loadSimState();
  const state = newSimState();
  const version = await saveSimState(state, current.version);
  if (version == null) {
    throw new Error('Simulator state changed during reset; retry the operation');
  }
  return { state, version, backend: current.backend };
}
