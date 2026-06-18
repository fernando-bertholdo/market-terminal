import { neon } from '@neondatabase/serverless';
import type {
  ConsolidatedMarketQuote,
  MarketObservation,
  ProviderHealth,
} from './types';

let schemaReady: Promise<void> | null = null;
let lastPersistedAt = 0;
const PERSIST_THROTTLE_MS = 30_000;

function postgres() {
  const url = process.env.DATABASE_URL?.trim();
  return url ? neon(url) : null;
}

async function ensureSchema(): Promise<void> {
  const sql = postgres();
  if (!sql) return;
  schemaReady ??= (async () => {
    await sql`
      CREATE TABLE IF NOT EXISTS market_observation_latest (
        instrument_id text NOT NULL,
        provider_id text NOT NULL,
        source_symbol text NOT NULL,
        observation jsonb NOT NULL,
        source_at timestamptz,
        received_at timestamptz NOT NULL,
        updated_at timestamptz NOT NULL DEFAULT now(),
        PRIMARY KEY (instrument_id, provider_id)
      )
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS market_snapshot (
        minute timestamptz NOT NULL,
        instrument_id text NOT NULL,
        quote jsonb NOT NULL,
        PRIMARY KEY (minute, instrument_id)
      )
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS market_provider_health (
        provider_id text PRIMARY KEY,
        health jsonb NOT NULL,
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `;
  })();
  await schemaReady;
}

export async function persistMarketSnapshot(
  observations: MarketObservation[],
  quotes: ConsolidatedMarketQuote[],
  health: ProviderHealth[],
  force = false
): Promise<'postgres' | 'disabled' | 'throttled'> {
  const sql = postgres();
  if (!sql) return 'disabled';
  const now = Date.now();
  if (!force && now - lastPersistedAt < PERSIST_THROTTLE_MS) return 'throttled';
  lastPersistedAt = now;
  await ensureSchema();

  for (const observation of observations) {
    await sql`
      INSERT INTO market_observation_latest (
        instrument_id, provider_id, source_symbol, observation, source_at, received_at
      )
      VALUES (
        ${observation.instrumentId},
        ${observation.providerId},
        ${observation.sourceSymbol},
        ${JSON.stringify(observation)}::jsonb,
        ${observation.sourceTimestamp},
        ${observation.receivedAt}
      )
      ON CONFLICT (instrument_id, provider_id)
      DO UPDATE SET
        source_symbol = EXCLUDED.source_symbol,
        observation = EXCLUDED.observation,
        source_at = EXCLUDED.source_at,
        received_at = EXCLUDED.received_at,
        updated_at = now()
    `;
  }

  const minute = new Date(Math.floor(now / 60_000) * 60_000).toISOString();
  for (const quote of quotes) {
    await sql`
      INSERT INTO market_snapshot (minute, instrument_id, quote)
      VALUES (${minute}, ${quote.instrumentId}, ${JSON.stringify(quote)}::jsonb)
      ON CONFLICT (minute, instrument_id)
      DO UPDATE SET quote = EXCLUDED.quote
    `;
  }

  for (const provider of health) {
    await sql`
      INSERT INTO market_provider_health (provider_id, health)
      VALUES (${provider.providerId}, ${JSON.stringify(provider)}::jsonb)
      ON CONFLICT (provider_id)
      DO UPDATE SET health = EXCLUDED.health, updated_at = now()
    `;
  }
  return 'postgres';
}

