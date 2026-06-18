export interface ProviderSymbolMap {
  instrumentId: string;
  unit: string;
  yahoo?: string;
  awesomeapi?: string;
  finnhub?: string;
  twelvedata?: string;
  tiingo?: string;
  alpaca?: string;
}

export const GLOBAL_PROVIDER_SYMBOLS: ProviderSymbolMap[] = [
  {
    instrumentId: 'FX:USDBRL:SPOT',
    unit: 'BRL',
    yahoo: 'BRL=X',
    awesomeapi: 'USD-BRL',
    finnhub: 'OANDA:USD_BRL',
    twelvedata: 'USD/BRL',
    tiingo: 'usdbrl',
  },
  {
    instrumentId: 'FX:EURBRL:SPOT',
    unit: 'BRL',
    yahoo: 'EURBRL=X',
    awesomeapi: 'EUR-BRL',
    finnhub: 'OANDA:EUR_BRL',
    twelvedata: 'EUR/BRL',
    tiingo: 'eurbrl',
  },
  {
    instrumentId: 'FX:EURUSD:SPOT',
    unit: 'USD',
    yahoo: 'EURUSD=X',
    awesomeapi: 'EUR-USD',
    finnhub: 'OANDA:EUR_USD',
    twelvedata: 'EUR/USD',
    tiingo: 'eurusd',
  },
  {
    instrumentId: 'FX:USDJPY:SPOT',
    unit: 'JPY',
    yahoo: 'USDJPY=X',
    awesomeapi: 'USD-JPY',
    finnhub: 'OANDA:USD_JPY',
    twelvedata: 'USD/JPY',
    tiingo: 'usdjpy',
  },
  {
    instrumentId: 'FX:GBPUSD:SPOT',
    unit: 'USD',
    yahoo: 'GBPUSD=X',
    awesomeapi: 'GBP-USD',
    finnhub: 'OANDA:GBP_USD',
    twelvedata: 'GBP/USD',
    tiingo: 'gbpusd',
  },
  {
    instrumentId: 'INDEX:DXY',
    unit: 'index',
    yahoo: 'DX-Y.NYB',
    twelvedata: 'DXY',
  },
  {
    instrumentId: 'INDEX:SPX',
    unit: 'index',
    yahoo: '^GSPC',
    finnhub: 'SPY',
    twelvedata: 'SPX',
    tiingo: 'SPY',
    alpaca: 'SPY',
  },
  {
    instrumentId: 'INDEX:VIX',
    unit: 'index',
    yahoo: '^VIX',
    twelvedata: 'VIX',
  },
  {
    instrumentId: 'INDEX:IBOV',
    unit: 'index',
    yahoo: '^BVSP',
  },
  {
    instrumentId: 'CMDTY:WTI:FRONT',
    unit: 'USD/bbl',
    yahoo: 'CL=F',
    twelvedata: 'CL1!',
  },
  {
    instrumentId: 'CMDTY:BRENT:FRONT',
    unit: 'USD/bbl',
    yahoo: 'BZ=F',
    twelvedata: 'BRN1!',
  },
  {
    instrumentId: 'CMDTY:GOLD:FRONT',
    unit: 'USD/oz',
    yahoo: 'GC=F',
    twelvedata: 'XAU/USD',
  },
  {
    instrumentId: 'CMDTY:COPPER:FRONT',
    unit: 'USD/lb',
    yahoo: 'HG=F',
  },
  {
    instrumentId: 'ETF:EWZ',
    unit: 'USD',
    yahoo: 'EWZ',
    finnhub: 'EWZ',
    twelvedata: 'EWZ',
    tiingo: 'EWZ',
    alpaca: 'EWZ',
  },
  {
    instrumentId: 'ETF:EEM',
    unit: 'USD',
    yahoo: 'EEM',
    finnhub: 'EEM',
    twelvedata: 'EEM',
    tiingo: 'EEM',
    alpaca: 'EEM',
  },
  ...[
    'PBR', 'VALE', 'ITUB', 'XOM', 'JPM', 'LMT', 'NVDA', 'MSFT', 'VST', 'CAT',
    'XLE', 'XLF', 'XLI', 'XLK',
  ].map((symbol): ProviderSymbolMap => ({
    instrumentId: `${symbol.startsWith('X') && symbol.length === 3 ? 'ETF' : 'EQUITY'}:${symbol}`,
    unit: 'USD',
    yahoo: symbol,
    finnhub: symbol,
    twelvedata: symbol,
    tiingo: symbol,
    alpaca: symbol,
  })),
];

const byYahoo = new Map(
  GLOBAL_PROVIDER_SYMBOLS.flatMap((mapping) =>
    mapping.yahoo ? [[mapping.yahoo, mapping] as const] : []
  )
);
const byInstrumentId = new Map(
  GLOBAL_PROVIDER_SYMBOLS.map((mapping) => [mapping.instrumentId, mapping])
);

export function mappingForYahooSymbol(symbol: string): ProviderSymbolMap | null {
  return byYahoo.get(symbol) ?? null;
}

export function mappingForInstrumentId(instrumentId: string): ProviderSymbolMap | null {
  return byInstrumentId.get(instrumentId) ?? null;
}
