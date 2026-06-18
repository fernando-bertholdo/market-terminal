// ─── Market Data Types ────────────────────────────────────────────────────────

export type ChangeDirection = 'up' | 'down' | 'unch';

export type NewsTheme =
  | 'monetary_policy'
  | 'inflation'
  | 'growth'
  | 'labor'
  | 'fiscal'
  | 'geopolitics'
  | 'energy'
  | 'metals'
  | 'agriculture'
  | 'fx'
  | 'credit'
  | 'equities'
  | 'trade';

export type NewsFactor =
  | 'rates_br'
  | 'rates_us'
  | 'usd'
  | 'brl'
  | 'inflation'
  | 'growth'
  | 'risk'
  | 'energy'
  | 'metals'
  | 'agriculture'
  | 'credit'
  | 'technology'
  | 'defense'
  | 'power';

export type NewsAsset =
  | 'DI'
  | 'UST'
  | 'BRL'
  | 'DXY'
  | 'IBOV'
  | 'SPX'
  | 'OIL'
  | 'GOLD'
  | 'COPPER'
  | 'SOY';

export interface NewsSignal {
  id: NewsFactor | NewsAsset;
  direction: -1 | 0 | 1;
  strength: number;
}

export interface NewsClassification {
  themes: NewsTheme[];
  factors: NewsSignal[];
  assets: NewsSignal[];
  relevance: number;
  confidence: number;
  decay: number;
  ageMinutes: number;
  halfLifeMinutes: number;
}

export interface NewsItem {
  id: string;          // hash of URL
  title: string;
  source: 'BLOOMBERG' | 'REUTERS' | string;
  url: string;
  publishedAt: Date;
  classification?: NewsClassification;
  duplicateCount?: number;
}

export interface NewsAggregate {
  id: NewsFactor | NewsAsset;
  score: number;
  intensity: number;
  mentions: number;
  positive: number;
  negative: number;
  neutral: number;
  latestAt: string | null;
}

export interface NewsIntelligence {
  asOf: string;
  itemCount: number;
  classifiedCount: number;
  assets: Partial<Record<NewsAsset, NewsAggregate>>;
  factors: Partial<Record<NewsFactor, NewsAggregate>>;
}

export interface NewsFreshness {
  ttlMs: number;
  staleIfErrorMs: number;
  oldestSourceAgeMs: number | null;
  newestPublishedAt: string | null;
}

export interface NewsApiResponse extends ApiResponse<NewsItem[]> {
  intelligence: NewsIntelligence;
  freshness: NewsFreshness;
}

export interface MarketDataPoint {
  id: string;
  instrument: string;
  value: number | null;
  previousValue: number | null;
  change: number | null;         // absolute change
  changePct: number | null;      // % change
  changeType: 'bps' | 'pct' | 'abs';
  dataType: 'yield' | 'fx' | 'commodity' | 'index' | 'spread';
  unit: string;
  source: string;
  lastUpdated: Date | null;
}

export interface PanelState {
  isLoading: boolean;
  isStale: boolean;
  lastUpdated: Date | null;
  error: string | null;
}

export interface PanelData {
  panelId: string;
  items: MarketDataPoint[];
  fetchedAt: Date;
  error: string | null;
}

export interface ApiResponse<T> {
  data: T;
  fetchedAt: string;  // ISO string
  error: string | null;
  sources?: Record<string, SourceStatus>;
}

export interface SourceStatus {
  ok: boolean;
  label: string;
  message: string | null;
  stale?: boolean;
  cache?: 'hit' | 'miss' | 'refresh' | 'stale';
  fetchedAt?: string | null;
  lastSuccessAt?: string | null;
  ageMs?: number | null;
  itemCount?: number;
  invalidItemCount?: number;
}
