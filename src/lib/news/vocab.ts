// Runtime vocabularies for the news classification contract.
//
// The `NewsTheme` / `NewsFactor` / `NewsAsset` unions in `@/types/market` are
// compile-time only. Both the regex classifier and the ML adapter need runtime
// sets to validate signals (especially anything coming back from the external
// Python NLP service, which must never be trusted blindly). Keep these in sync
// with the unions in `src/types/market.ts`.

import type { NewsAsset, NewsFactor, NewsTheme } from '@/types/market';

export const NEWS_THEMES: readonly NewsTheme[] = [
  'monetary_policy',
  'inflation',
  'growth',
  'labor',
  'fiscal',
  'geopolitics',
  'energy',
  'metals',
  'agriculture',
  'fx',
  'credit',
  'equities',
  'trade',
];

export const NEWS_FACTORS: readonly NewsFactor[] = [
  'rates_br',
  'rates_us',
  'usd',
  'brl',
  'inflation',
  'growth',
  'risk',
  'energy',
  'metals',
  'agriculture',
  'credit',
  'technology',
  'defense',
  'power',
];

export const NEWS_ASSETS: readonly NewsAsset[] = [
  'DI',
  'UST',
  'BRL',
  'DXY',
  'IBOV',
  'SPX',
  'OIL',
  'GOLD',
  'COPPER',
  'SOY',
];

const THEME_SET = new Set<string>(NEWS_THEMES);
const FACTOR_SET = new Set<string>(NEWS_FACTORS);
const ASSET_SET = new Set<string>(NEWS_ASSETS);

export function isNewsTheme(value: unknown): value is NewsTheme {
  return typeof value === 'string' && THEME_SET.has(value);
}

export function isNewsFactor(value: unknown): value is NewsFactor {
  return typeof value === 'string' && FACTOR_SET.has(value);
}

export function isNewsAsset(value: unknown): value is NewsAsset {
  return typeof value === 'string' && ASSET_SET.has(value);
}
