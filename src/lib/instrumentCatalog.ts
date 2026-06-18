// ─── Instrument Catalog ─────────────────────────────────────────────────────────
// Single flat list of every instrument the terminal knows about, with accessors
// into the /api/market payload. Powers click-to-chart, the editable watchlist,
// price alerts, and command-palette instrument search.
//
// `symbol` is the Yahoo Finance ticker used for history/charting — instruments
// without one (BCB series, DI futures) show live values but cannot be charted.

export type InstrumentGroup = 'FX' | 'RATES BR' | 'RATES US' | 'CMDTY' | 'INDEX';

export interface CatalogInstrument {
  id: string;
  label: string;
  group: InstrumentGroup;
  /** Yahoo symbol for /api/history charting (undefined = not chartable) */
  symbol?: string;
  decimals: number;
  /** how getChange should be displayed */
  changeKind: 'pct' | 'bps';
  source: string;
  getValue: (data: any) => number | null;
  getChange: (data: any) => number | null;
}

const v = (x: number | null | undefined): number | null => (x ?? null);

export const INSTRUMENT_CATALOG: CatalogInstrument[] = [
  // ── FX ──────────────────────────────────────────────────────────────────────
  { id: 'usdbrl', label: 'USD/BRL', group: 'FX', symbol: 'BRL=X', decimals: 4, changeKind: 'pct', source: 'YH',
    getValue: (d) => v(d?.fx?.usdbrl), getChange: (d) => v(d?.fx?.usdbrlChangePct) },
  { id: 'eurbrl', label: 'EUR/BRL', group: 'FX', symbol: 'EURBRL=X', decimals: 4, changeKind: 'pct', source: 'YH',
    getValue: (d) => v(d?.fx?.eurbrl), getChange: (d) => v(d?.fx?.eurbrlChangePct) },
  { id: 'eurusd', label: 'EUR/USD', group: 'FX', symbol: 'EURUSD=X', decimals: 4, changeKind: 'pct', source: 'YH',
    getValue: (d) => v(d?.fx?.eurusd), getChange: (d) => v(d?.fx?.eurusdChangePct) },
  { id: 'usdjpy', label: 'USD/JPY', group: 'FX', symbol: 'USDJPY=X', decimals: 2, changeKind: 'pct', source: 'YH',
    getValue: (d) => v(d?.fx?.usdjpy), getChange: (d) => v(d?.fx?.usdjpyChangePct) },
  { id: 'gbpusd', label: 'GBP/USD', group: 'FX', symbol: 'GBPUSD=X', decimals: 4, changeKind: 'pct', source: 'YH',
    getValue: (d) => v(d?.fx?.gbpusd), getChange: (d) => v(d?.fx?.gbpusdChangePct) },
  { id: 'dxy', label: 'DXY', group: 'FX', symbol: 'DX-Y.NYB', decimals: 2, changeKind: 'pct', source: 'YH',
    getValue: (d) => v(d?.fx?.dxy), getChange: (d) => v(d?.fx?.dxyChangePct) },

  // ── Brazil rates ────────────────────────────────────────────────────────────
  { id: 'selic', label: 'SELIC', group: 'RATES BR', decimals: 2, changeKind: 'bps', source: 'BCB',
    getValue: (d) => v(d?.brazil?.selic), getChange: (d) => v(d?.brazil?.selicChange) },
  { id: 'cdi', label: 'CDI', group: 'RATES BR', decimals: 2, changeKind: 'bps', source: 'BCB',
    getValue: (d) => v(d?.brazil?.cdi), getChange: (d) => v(d?.brazil?.cdiChange) },
  { id: 'ipca', label: 'IPCA (m/m)', group: 'RATES BR', decimals: 2, changeKind: 'bps', source: 'BCB',
    getValue: (d) => v(d?.brazil?.ipca), getChange: () => null },
  { id: 'di-jul26', label: 'DI Jul/26', group: 'RATES BR', decimals: 2, changeKind: 'bps', source: 'B3',
    getValue: (d) => v(d?.brazil?.di?.DI1N26?.rate), getChange: (d) => v(d?.brazil?.di?.DI1N26?.change) },
  { id: 'di-jan27', label: 'DI Jan/27', group: 'RATES BR', decimals: 2, changeKind: 'bps', source: 'B3',
    getValue: (d) => v(d?.brazil?.di?.DI1F27?.rate), getChange: (d) => v(d?.brazil?.di?.DI1F27?.change) },
  { id: 'di-jan28', label: 'DI Jan/28', group: 'RATES BR', decimals: 2, changeKind: 'bps', source: 'B3',
    getValue: (d) => v(d?.brazil?.di?.DI1F28?.rate), getChange: (d) => v(d?.brazil?.di?.DI1F28?.change) },
  { id: 'di-jan30', label: 'DI Jan/30', group: 'RATES BR', decimals: 2, changeKind: 'bps', source: 'B3',
    getValue: (d) => v(d?.brazil?.di?.DI1F30?.rate), getChange: (d) => v(d?.brazil?.di?.DI1F30?.change) },

  // ── US rates (Yahoo CBOE yield indices used for charting) ───────────────────
  { id: 'fedfunds', label: 'Fed Funds', group: 'RATES US', decimals: 2, changeKind: 'bps', source: 'FRED',
    getValue: (d) => v(d?.us?.fedFunds), getChange: (d) => v(d?.us?.fedFundsChange) },
  { id: 'ust2y', label: 'US 2Y', group: 'RATES US', decimals: 2, changeKind: 'bps', source: 'FRED',
    getValue: (d) => v(d?.us?.ust2y), getChange: (d) => v(d?.us?.ust2yChange) },
  { id: 'ust5y', label: 'US 5Y', group: 'RATES US', symbol: '^FVX', decimals: 2, changeKind: 'bps', source: 'FRED',
    getValue: (d) => v(d?.us?.ust5y), getChange: (d) => v(d?.us?.ust5yChange) },
  { id: 'ust10y', label: 'US 10Y', group: 'RATES US', symbol: '^TNX', decimals: 2, changeKind: 'bps', source: 'FRED',
    getValue: (d) => v(d?.us?.ust10y), getChange: (d) => v(d?.us?.ust10yChange) },
  { id: 'ust30y', label: 'US 30Y', group: 'RATES US', symbol: '^TYX', decimals: 2, changeKind: 'bps', source: 'FRED',
    getValue: (d) => v(d?.us?.ust30y), getChange: (d) => v(d?.us?.ust30yChange) },

  // ── Commodities ─────────────────────────────────────────────────────────────
  { id: 'wti', label: 'WTI', group: 'CMDTY', symbol: 'CL=F', decimals: 2, changeKind: 'pct', source: 'YH',
    getValue: (d) => v(d?.commodities?.wti), getChange: (d) => v(d?.commodities?.wtiChangePct) },
  { id: 'brent', label: 'Brent', group: 'CMDTY', symbol: 'BZ=F', decimals: 2, changeKind: 'pct', source: 'YH',
    getValue: (d) => v(d?.commodities?.brent), getChange: (d) => v(d?.commodities?.brentChangePct) },
  { id: 'gold', label: 'Gold', group: 'CMDTY', symbol: 'GC=F', decimals: 0, changeKind: 'pct', source: 'YH',
    getValue: (d) => v(d?.commodities?.gold), getChange: (d) => v(d?.commodities?.goldChangePct) },
  { id: 'ironore', label: 'Iron Ore', group: 'CMDTY', symbol: 'TIO=F', decimals: 2, changeKind: 'pct', source: 'YH',
    getValue: (d) => v(d?.commodities?.ironOre), getChange: (d) => v(d?.commodities?.ironOreChangePct) },
  { id: 'soybeans', label: 'Soybeans', group: 'CMDTY', symbol: 'ZS=F', decimals: 2, changeKind: 'pct', source: 'YH',
    getValue: (d) => v(d?.commodities?.soybeans), getChange: (d) => v(d?.commodities?.soybeansChangePct) },
  { id: 'copper', label: 'Copper', group: 'CMDTY', symbol: 'HG=F', decimals: 3, changeKind: 'pct', source: 'YH',
    getValue: (d) => v(d?.commodities?.copper), getChange: (d) => v(d?.commodities?.copperChangePct) },

  // ── Indices ─────────────────────────────────────────────────────────────────
  { id: 'spx', label: 'S&P 500', group: 'INDEX', symbol: '^GSPC', decimals: 0, changeKind: 'pct', source: 'YH',
    getValue: (d) => v(d?.global?.spx), getChange: (d) => v(d?.global?.spxChangePct) },
  { id: 'ibov', label: 'IBOV', group: 'INDEX', symbol: '^BVSP', decimals: 0, changeKind: 'pct', source: 'YH',
    getValue: (d) => v(d?.global?.ibov), getChange: (d) => v(d?.global?.ibovChangePct) },
  { id: 'ewz', label: 'Brazil Equities (EWZ)', group: 'INDEX', symbol: 'EWZ', decimals: 2, changeKind: 'pct', source: 'YH',
    getValue: (d) => v(d?.global?.ewz), getChange: (d) => v(d?.global?.ewzChangePct) },
  { id: 'eem', label: 'Emerging Markets (EEM)', group: 'INDEX', symbol: 'EEM', decimals: 2, changeKind: 'pct', source: 'YH',
    getValue: (d) => v(d?.global?.eem), getChange: (d) => v(d?.global?.eemChangePct) },
  { id: 'xle', label: 'US Energy (XLE)', group: 'INDEX', symbol: 'XLE', decimals: 2, changeKind: 'pct', source: 'YH',
    getValue: (d) => v(d?.global?.xle), getChange: (d) => v(d?.global?.xleChangePct) },
  { id: 'xlf', label: 'US Financials (XLF)', group: 'INDEX', symbol: 'XLF', decimals: 2, changeKind: 'pct', source: 'YH',
    getValue: (d) => v(d?.global?.xlf), getChange: (d) => v(d?.global?.xlfChangePct) },
  { id: 'xli', label: 'US Industrials (XLI)', group: 'INDEX', symbol: 'XLI', decimals: 2, changeKind: 'pct', source: 'YH',
    getValue: (d) => v(d?.global?.xli), getChange: (d) => v(d?.global?.xliChangePct) },
  { id: 'xlk', label: 'US Technology (XLK)', group: 'INDEX', symbol: 'XLK', decimals: 2, changeKind: 'pct', source: 'YH',
    getValue: (d) => v(d?.global?.xlk), getChange: (d) => v(d?.global?.xlkChangePct) },
  { id: 'vix', label: 'VIX', group: 'INDEX', symbol: '^VIX', decimals: 2, changeKind: 'pct', source: 'YH',
    getValue: (d) => v(d?.global?.vix), getChange: (d) => v(d?.global?.vixChangePct) },
];

const byId = new Map(INSTRUMENT_CATALOG.map((inst) => [inst.id, inst]));

export function findInstrument(id: string): CatalogInstrument | undefined {
  return byId.get(id);
}

export const CHARTABLE_INSTRUMENTS = INSTRUMENT_CATALOG.filter((inst) => inst.symbol);

export const DEFAULT_WATCHLIST_IDS = [
  'usdbrl', 'di-jan28', 'ust10y', 'dxy', 'brent', 'gold', 'ironore', 'spx',
];
