export const B3_FIXED_INCOME_SYMBOLS = [
  'DI1N26',
  'DI1F27',
  'DI1F28',
  'DI1F29',
  'DI1F30',
  'DI1F31',
  'DI1F32',
  'DI1F33',
  'DDIN26',
  'DDIF27',
  'DDIF28',
  'DDIF30',
  'DAPF27',
  'DAPK27',
  'DAPQ28',
  'DAPK29',
  'DAPQ30',
] as const;

export const B3_MACRO_FUTURES_SYMBOLS = [
  'DOLN26',
  'WDON26',
  'INDM26',
  'WINM26',
] as const;

export const B3_MARKET_SYMBOLS = [
  ...B3_FIXED_INCOME_SYMBOLS,
  ...B3_MACRO_FUTURES_SYMBOLS,
] as const;

const MONTH_CODES = ['F', 'G', 'H', 'J', 'K', 'M', 'N', 'Q', 'U', 'V', 'X', 'Z'];

function contract(prefix: string, month: number, year: number): string {
  return `${prefix}${MONTH_CODES[month - 1]}${String(year).slice(-2)}`;
}

/** Rolling candidate universe. Invalid or inactive symbols simply return B3 NOK. */
export function getB3MarketSymbols(now = new Date()): string[] {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth() + 1;
  const symbols = new Set<string>();

  // DI: next July plus January points through the long end.
  if (month <= 7) symbols.add(contract('DI1', 7, year));
  for (let offset = month === 1 ? 0 : 1; offset <= 7; offset += 1) {
    symbols.add(contract('DI1', 1, year + offset));
  }

  // DDI: rolling front months plus January annual points.
  for (let offset = 0; offset < 4; offset += 1) {
    const index = month - 1 + offset;
    symbols.add(contract('DDI', index % 12 + 1, year + Math.floor(index / 12)));
  }
  for (let offset = 1; offset <= 4; offset += 1) {
    symbols.add(contract('DDI', 1, year + offset));
  }

  // DAP liquidity is concentrated in selected January, May and August dates.
  for (let offset = 0; offset <= 4; offset += 1) {
    for (const maturityMonth of [1, 5, 8]) {
      if (offset === 0 && maturityMonth < month) continue;
      symbols.add(contract('DAP', maturityMonth, year + offset));
    }
  }

  // Rolling macro futures used as cross-checks.
  const frontIndex = month;
  const frontMonth = frontIndex % 12 + 1;
  const frontYear = year + Math.floor(frontIndex / 12);
  symbols.add(contract('DOL', frontMonth, frontYear));
  symbols.add(contract('WDO', frontMonth, frontYear));
  symbols.add(contract('IND', frontMonth, frontYear));
  symbols.add(contract('WIN', frontMonth, frontYear));
  return [...symbols];
}
