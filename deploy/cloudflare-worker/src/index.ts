export interface Env {
  TERMINAL_URL: string;
  CRON_SECRET: string;
  // Continuous head refinement (Phase 4). Optional: when set, the worker fires a
  // daily retrain on the news-nlp service. Leave NEWS_NLP_URL unset to disable.
  NEWS_NLP_URL?: string;
  NEWS_NLP_TOKEN?: string;
  RETRAIN_HOUR_UTC?: string; // hour (0-23) to run the daily retrain; default "6"
}

export default {
  async scheduled(
    controller: ScheduledController,
    env: Env,
    ctx: ExecutionContext
  ): Promise<void> {
    const simUrl = new URL('/api/sim', env.TERMINAL_URL);
    const marketUrl = new URL('/api/market', env.TERMINAL_URL);
    const tasks: Promise<unknown>[] = [
      fetch(marketUrl, {
        headers: { 'Authorization': `Bearer ${env.CRON_SECRET}` },
      }).then(async (response) => {
        if (!response.ok) {
          throw new Error(`ATLAS market refresh failed: HTTP ${response.status} ${await response.text()}`);
        }
      }),
      fetch(simUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.CRON_SECRET}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'tick' }),
      }).then(async (response) => {
        if (!response.ok) {
          throw new Error(`ATLAS tick failed: HTTP ${response.status} ${await response.text()}`);
        }
      }),
    ];

    // Once a day, wake the (scale-to-zero) news-nlp service and retrain the head
    // on the forward-collected tape. Cron fires every minute; gate to one hour:00.
    if (env.NEWS_NLP_URL) {
      const now = new Date(controller.scheduledTime);
      const targetHour = Number(env.RETRAIN_HOUR_UTC ?? '6');
      if (now.getUTCHours() === targetHour && now.getUTCMinutes() === 0) {
        const retrainUrl = new URL('/retrain', env.NEWS_NLP_URL);
        tasks.push(
          fetch(retrainUrl, {
            method: 'POST',
            headers: env.NEWS_NLP_TOKEN ? { 'Authorization': `Bearer ${env.NEWS_NLP_TOKEN}` } : {},
          }).then(async (response) => {
            if (!response.ok) {
              throw new Error(`news-nlp retrain failed: HTTP ${response.status} ${await response.text()}`);
            }
          })
        );
      }
    }

    ctx.waitUntil(Promise.all(tasks).then(() => undefined));
  },
};
