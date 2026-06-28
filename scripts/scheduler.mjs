// Tick interno: substitui o Cloudflare Worker num servidor persistente.
// A cada 60s: refresh de mercado + tick do paper book. Retrain diario opcional.
const TERMINAL_URL = process.env.TERMINAL_URL ?? 'http://web:3000';
const CRON_SECRET = process.env.CRON_SECRET ?? '';
const NEWS_NLP_URL = process.env.NEWS_NLP_URL;
const RETRAIN_HOUR_UTC = Number(process.env.RETRAIN_HOUR_UTC ?? '6');

async function hit(path, init) {
  const res = await fetch(new URL(path, TERMINAL_URL), init);
  if (!res.ok) {
    console.error(`[scheduler] ${path}: HTTP ${res.status} ${await res.text()}`);
  }
  return res;
}

async function tick() {
  const auth = { Authorization: `Bearer ${CRON_SECRET}` };
  try {
    await hit('/api/market', { headers: auth });
    await hit('/api/sim', {
      method: 'POST',
      headers: { ...auth, 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'tick' }),
    });
  } catch (err) {
    console.error('[scheduler] tick failed:', err);
  }

  // Retrain diario opcional do news-nlp (gate por hora UTC, como no worker).
  if (NEWS_NLP_URL) {
    const now = new Date();
    if (now.getUTCHours() === RETRAIN_HOUR_UTC && now.getUTCMinutes() === 0) {
      try {
        await fetch(new URL('/retrain', NEWS_NLP_URL), { method: 'POST' });
      } catch (err) {
        console.error('[scheduler] retrain failed:', err);
      }
    }
  }
}

console.log(`[scheduler] tick a cada 60s -> ${TERMINAL_URL}`);
tick();
setInterval(tick, 60_000);
