// Forward collection (Phase 4, A1b).
//
// RSS headlines are ephemeral — they age out of the feed within hours. To refine
// the per-asset head over time (and to ever accumulate PT/Brazil reactions, which
// the historical archives are thin on), we persist every newly-seen headline with
// its publish timestamp. A periodic offline job (research/news-bootstrap/
// forward_to_dataset.py) then labels them against Yahoo intraday (§8) and retrains.
//
// Storage mirrors the simulator: Neon when DATABASE_URL is set (survives Vercel
// redeploys), else an append-only JSONL under data/ for local dev. Best-effort:
// any failure is logged and swallowed so it can never break /api/news.
//
// No-lookahead: we store only the headline + its own publishedAt. Labels are
// derived later, offline, from prices strictly AFTER publish.

import fs from 'fs';
import path from 'path';
import { neon } from '@neondatabase/serverless';
import type { NewsItem } from '@/types/market';

const STORE_DIR = path.join(process.cwd(), 'data');
const STORE_FILE = path.join(STORE_DIR, 'news-forward.jsonl');

const ENABLED = process.env.NEWS_FORWARD_ENABLED === 'true' || process.env.NEWS_FORWARD_ENABLED === '1';

let schemaReady: Promise<void> | null = null;
let fileSeed: Set<string> | null = null;

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
      CREATE TABLE IF NOT EXISTS news_forward (
        id text PRIMARY KEY,
        title text NOT NULL,
        source text,
        published_at timestamptz,
        observed_at timestamptz NOT NULL DEFAULT now()
      )
    `;
  })();
  return schemaReady;
}

async function recordPostgres(items: NewsItem[]): Promise<void> {
  const sql = postgres();
  if (!sql) return;
  await ensureSchema();
  // First sighting wins; ON CONFLICT keeps the earliest observed_at.
  for (const item of items) {
    await sql`
      INSERT INTO news_forward (id, title, source, published_at)
      VALUES (${item.id}, ${item.title}, ${String(item.source)}, ${item.publishedAt.toISOString()})
      ON CONFLICT (id) DO NOTHING
    `;
  }
}

function loadFileSeed(): Set<string> {
  if (fileSeed) return fileSeed;
  const seen = new Set<string>();
  try {
    if (fs.existsSync(STORE_FILE)) {
      for (const line of fs.readFileSync(STORE_FILE, 'utf-8').split('\n')) {
        if (!line.trim()) continue;
        try {
          const id = (JSON.parse(line) as { id?: string }).id;
          if (id) seen.add(id);
        } catch {
          /* skip malformed line */
        }
      }
    }
  } catch (error) {
    console.error('[News/forward] Could not read local store:', error);
  }
  fileSeed = seen;
  return seen;
}

function recordFile(items: NewsItem[]): void {
  const seen = loadFileSeed();
  const fresh = items.filter((item) => !seen.has(item.id));
  if (fresh.length === 0) return;
  if (!fs.existsSync(STORE_DIR)) fs.mkdirSync(STORE_DIR, { recursive: true });
  const observedAt = new Date().toISOString();
  const lines = fresh
    .map((item) =>
      JSON.stringify({
        id: item.id,
        title: item.title,
        source: String(item.source),
        published_at: item.publishedAt.toISOString(),
        observed_at: observedAt,
      })
    )
    .join('\n');
  fs.appendFileSync(STORE_FILE, lines + '\n', 'utf-8');
  for (const item of fresh) seen.add(item.id);
}

// Persist newly-seen headlines. Awaited by the fetcher but fully isolated: it
// never throws and never blocks the news response on failure.
export async function recordForwardHeadlines(items: NewsItem[]): Promise<void> {
  if (!ENABLED || items.length === 0) return;
  try {
    if (databaseUrl()) {
      await recordPostgres(items);
    } else {
      recordFile(items);
    }
  } catch (error) {
    console.error('[News/forward] Failed to record headlines:', error);
  }
}
