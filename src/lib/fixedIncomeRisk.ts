export interface FixedIncomeRiskRow {
  id: string;
  label: string;
  market: 'BR' | 'US';
  instrumentType: 'DI_FUTURE' | 'PAR_BOND_PROXY';
  rate: number | null;
  maturityDate: string | null;
  businessDays: number | null;
  macaulayDuration: number | null;
  modifiedDuration: number | null;
  convexity: number | null;
  price: number | null;
  dv01: number | null;
  dv01Currency: 'BRL' | 'USD';
  riskNotional: number;
  contractsPerRiskUnit: number | null;
  methodology: string;
}

export interface FixedIncomeRiskData {
  asOf: string;
  brazil: FixedIncomeRiskRow[];
  us: FixedIncomeRiskRow[];
  assumptions: string[];
}

interface DiDefinition {
  id: string;
  label: string;
  year: number;
  month: number;
}

const DI_CONTRACTS: DiDefinition[] = [
  { id: 'DI1N26', label: 'DI Jul/26', year: 2026, month: 7 },
  { id: 'DI1F27', label: 'DI Jan/27', year: 2027, month: 1 },
  { id: 'DI1F28', label: 'DI Jan/28', year: 2028, month: 1 },
  { id: 'DI1F30', label: 'DI Jan/30', year: 2030, month: 1 },
];

const UST_TENORS = [
  { id: 'UST2Y', label: 'US 2Y', years: 2, field: 'ust2y' },
  { id: 'UST5Y', label: 'US 5Y', years: 5, field: 'ust5y' },
  { id: 'UST10Y', label: 'US 10Y', years: 10, field: 'ust10y' },
  { id: 'UST30Y', label: 'US 30Y', years: 30, field: 'ust30y' },
] as const;

const DAY_MS = 86_400_000;
const DI_TERMINAL_PU = 100_000;
const UST_RISK_NOTIONAL = 1_000_000;

function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function utcDate(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day));
}

function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return utcDate(year, month, day);
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

function brazilMarketHolidays(year: number): Set<string> {
  const easter = easterSunday(year);
  const holidays = [
    utcDate(year, 1, 1),
    addDays(easter, -48), // Carnival Monday
    addDays(easter, -47), // Carnival Tuesday
    addDays(easter, -2),  // Good Friday
    utcDate(year, 4, 21),
    utcDate(year, 5, 1),
    addDays(easter, 60),  // Corpus Christi
    utcDate(year, 9, 7),
    utcDate(year, 10, 12),
    utcDate(year, 11, 2),
    utcDate(year, 11, 15),
    utcDate(year, 11, 20),
    utcDate(year, 12, 25),
  ];
  return new Set(holidays.map(dateKey));
}

function isBrazilBusinessDay(date: Date): boolean {
  const weekday = date.getUTCDay();
  if (weekday === 0 || weekday === 6) return false;
  return !brazilMarketHolidays(date.getUTCFullYear()).has(dateKey(date));
}

function firstBusinessDay(year: number, month: number): Date {
  let date = utcDate(year, month, 1);
  while (!isBrazilBusinessDay(date)) date = addDays(date, 1);
  return date;
}

function businessDaysBetween(start: Date, end: Date): number {
  if (end <= start) return 0;
  let count = 0;
  for (let date = addDays(start, 1); date <= end; date = addDays(date, 1)) {
    if (isBrazilBusinessDay(date)) count += 1;
  }
  return count;
}

function saoPauloToday(): Date {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);
  return utcDate(get('year'), get('month'), get('day'));
}

function diPu(ratePct: number, businessDays: number): number {
  return DI_TERMINAL_PU / Math.pow(1 + ratePct / 100, businessDays / 252);
}

function diRisk(definition: DiDefinition, rate: number | null, asOf: Date): FixedIncomeRiskRow {
  const maturity = firstBusinessDay(definition.year, definition.month);
  const businessDays = businessDaysBetween(asOf, maturity);
  if (rate == null || businessDays <= 0) {
    return {
      id: definition.id,
      label: definition.label,
      market: 'BR',
      instrumentType: 'DI_FUTURE',
      rate,
      maturityDate: dateKey(maturity),
      businessDays,
      macaulayDuration: businessDays / 252,
      modifiedDuration: null,
      convexity: null,
      price: null,
      dv01: null,
      dv01Currency: 'BRL',
      riskNotional: 1,
      contractsPerRiskUnit: null,
      methodology: 'B3 DI1 zero-coupon PU; risk per contract',
    };
  }

  const years = businessDays / 252;
  const y = rate / 100;
  const price = diPu(rate, businessDays);
  const up = diPu(rate + 0.01, businessDays);
  const down = diPu(rate - 0.01, businessDays);
  const dv01 = Math.abs(down - up) / 2;
  const modifiedDuration = years / (1 + y);
  const convexity = years * (years + 1) / Math.pow(1 + y, 2);

  return {
    id: definition.id,
    label: definition.label,
    market: 'BR',
    instrumentType: 'DI_FUTURE',
    rate,
    maturityDate: dateKey(maturity),
    businessDays,
    macaulayDuration: years,
    modifiedDuration,
    convexity,
    price,
    dv01,
    dv01Currency: 'BRL',
    riskNotional: 1,
    contractsPerRiskUnit: dv01 > 0 ? 1_000 / dv01 : null,
    methodology: 'B3 DI1 zero-coupon PU; risk per contract',
  };
}

function bondPrice(
  yieldPct: number,
  couponPct: number,
  years: number,
  faceValue: number
): number {
  const periods = years * 2;
  const periodYield = yieldPct / 100 / 2;
  const coupon = faceValue * couponPct / 100 / 2;
  let price = 0;
  for (let period = 1; period <= periods; period += 1) {
    const cashFlow = period === periods ? coupon + faceValue : coupon;
    price += cashFlow / Math.pow(1 + periodYield, period);
  }
  return price;
}

function treasuryRisk(
  id: string,
  label: string,
  years: number,
  rate: number | null
): FixedIncomeRiskRow {
  if (rate == null) {
    return {
      id,
      label,
      market: 'US',
      instrumentType: 'PAR_BOND_PROXY',
      rate,
      maturityDate: null,
      businessDays: null,
      macaulayDuration: null,
      modifiedDuration: null,
      convexity: null,
      price: null,
      dv01: null,
      dv01Currency: 'USD',
      riskNotional: UST_RISK_NOTIONAL,
      contractsPerRiskUnit: null,
      methodology: 'Par Treasury proxy; semiannual coupon equals current yield',
    };
  }

  const face = 100;
  const price = bondPrice(rate, rate, years, face);
  const up = bondPrice(rate + 0.01, rate, years, face);
  const down = bondPrice(rate - 0.01, rate, years, face);
  const dv01Per100 = Math.abs(down - up) / 2;
  const modifiedDuration = dv01Per100 / (price * 0.0001);
  const macaulayDuration = modifiedDuration * (1 + rate / 100 / 2);
  const convexity = (up + down - 2 * price) / (price * 0.0001 * 0.0001);

  return {
    id,
    label,
    market: 'US',
    instrumentType: 'PAR_BOND_PROXY',
    rate,
    maturityDate: null,
    businessDays: null,
    macaulayDuration,
    modifiedDuration,
    convexity,
    price,
    dv01: dv01Per100 * (UST_RISK_NOTIONAL / 100),
    dv01Currency: 'USD',
    riskNotional: UST_RISK_NOTIONAL,
    contractsPerRiskUnit: null,
    methodology: 'Par Treasury proxy; semiannual coupon equals current yield',
  };
}

export function calculateFixedIncomeRisk(market: any): FixedIncomeRiskData {
  const asOf = saoPauloToday();
  const diRates: Record<string, number | null> = {
    DI1N26: market?.brazil?.di?.DI1N26?.rate ?? null,
    DI1F27: market?.brazil?.di?.DI1F27?.rate ?? null,
    DI1F28: market?.brazil?.di?.DI1F28?.rate ?? null,
    DI1F30: market?.brazil?.di?.DI1F30?.rate ?? null,
  };

  return {
    asOf: dateKey(asOf),
    brazil: DI_CONTRACTS.map((definition) => diRisk(definition, diRates[definition.id], asOf)),
    us: UST_TENORS.map((tenor) =>
      treasuryRisk(tenor.id, tenor.label, tenor.years, market?.us?.[tenor.field] ?? null)
    ),
    assumptions: [
      'DI1 uses the B3 zero-coupon PU convention with 100,000 points at maturity; DV01 is per contract.',
      'Brazil business-day counts use weekends and the standard national/B3 holiday set.',
      'Treasury rows are par-bond proxies per USD 1 million, not identified deliverable securities.',
      'Positive DV01 is reported as the absolute P&L magnitude for a parallel 1 bp yield move.',
    ],
  };
}
