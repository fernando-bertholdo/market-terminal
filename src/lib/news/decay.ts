// Shared time-decay + clamp helpers for news classification.
//
// Both the regex classifier and the ML adapter must age headlines identically so
// that `aggregates.ts` weighs them on the same scale. This is the single source
// of truth for that math. No-lookahead note: decay only uses the headline's own
// `publishedAt` versus `now` — it never reads price or any future signal.

import type { NewsTheme } from '@/types/market';

export function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, value));
}

export interface TimeDecay {
  ageMinutes: number;
  halfLifeMinutes: number;
  decay: number;
}

export function deriveTimeDecay(
  themes: Iterable<NewsTheme>,
  publishedAt: Date,
  now: Date
): TimeDecay {
  const themeSet = themes instanceof Set ? themes : new Set(themes);
  const ageMinutes = Math.max(0, (now.getTime() - publishedAt.getTime()) / 60_000);
  const halfLifeMinutes =
    themeSet.has('monetary_policy') || themeSet.has('inflation') ? 720 : 360;
  const decay = Math.pow(0.5, ageMinutes / halfLifeMinutes);
  return {
    ageMinutes: Math.round(ageMinutes),
    halfLifeMinutes,
    decay: clamp(decay),
  };
}
