import type { B3Snapshot } from './fetchers/b3';

export type FixedIncomeCurveFamily = 'DI1' | 'DDI' | 'DAP';
export type CurveDayCount = 'DU/252' | 'ACT/360';

export interface ConstantMaturityVertex {
  label: string;
  years: number;
}

export interface FixedIncomeCurvePoint {
  symbol: string;
  family: FixedIncomeCurveFamily;
  maturityDate: string;
  days: number;
  yearFraction: number;
  rate: number;
  discountFactor: number;
  source: 'snapshot' | 'interpolated';
  receivedAt: string | null;
}

export interface FixedIncomeCurve {
  family: FixedIncomeCurveFamily;
  asOf: string;
  dayCount: CurveDayCount;
  points: FixedIncomeCurvePoint[];
  vertices: FixedIncomeCurvePoint[];
}

export type FixedIncomeCurves = Record<FixedIncomeCurveFamily, FixedIncomeCurve>;

export interface FlatForward252Result {
  targetDate: string;
  businessDays: number;
  rate: number;
  discountFactor: number;
  forwardRate: number;
  weight: number;
  previous: FixedIncomeCurvePoint;
  next: FixedIncomeCurvePoint;
}

const DAY_MS = 86_400_000;
const MONTH_CODES: Record<string, number> = {
  F: 1,
  G: 2,
  H: 3,
  J: 4,
  K: 5,
  M: 6,
  N: 7,
  Q: 8,
  U: 9,
  V: 10,
  X: 11,
  Z: 12,
};

export const CONSTANT_MATURITY_VERTICES: readonly ConstantMaturityVertex[] = [
  { label: '1M', years: 1 / 12 },
  { label: '3M', years: 3 / 12 },
  { label: '6M', years: 6 / 12 },
  { label: '1Y', years: 1 },
  { label: '2Y', years: 2 },
  { label: '3Y', years: 3 },
  { label: '5Y', years: 5 },
  { label: '10Y', years: 10 },
];

function utcDate(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day));
}

function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
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

function brazilMarketHolidays(year: number): Set<string> {
  const easter = easterSunday(year);
  return new Set([
    utcDate(year, 1, 1),
    addDays(easter, -48),
    addDays(easter, -47),
    addDays(easter, -2),
    utcDate(year, 4, 21),
    utcDate(year, 5, 1),
    addDays(easter, 60),
    utcDate(year, 9, 7),
    utcDate(year, 10, 12),
    utcDate(year, 11, 2),
    utcDate(year, 11, 15),
    utcDate(year, 11, 20),
    utcDate(year, 12, 25),
  ].map(dateKey));
}

export function isBrazilBusinessDay(date: Date): boolean {
  const weekday = date.getUTCDay();
  return weekday !== 0
    && weekday !== 6
    && !brazilMarketHolidays(date.getUTCFullYear()).has(dateKey(date));
}

function followingBusinessDay(date: Date): Date {
  let adjusted = date;
  while (!isBrazilBusinessDay(adjusted)) adjusted = addDays(adjusted, 1);
  return adjusted;
}

function firstBusinessDay(year: number, month: number): Date {
  return followingBusinessDay(utcDate(year, month, 1));
}

export function businessDaysBetween(start: Date, end: Date): number {
  if (end <= start) return 0;
  let days = 0;
  for (let date = addDays(start, 1); date <= end; date = addDays(date, 1)) {
    if (isBrazilBusinessDay(date)) days += 1;
  }
  return days;
}

function calendarDaysBetween(start: Date, end: Date): number {
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / DAY_MS));
}

function saoPauloToday(): Date {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);
  return utcDate(value('year'), value('month'), value('day'));
}

function normalizeDate(date: Date): Date {
  return utcDate(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
}

export function contractMaturity(symbol: string): Date | null {
  const match = /^(DI1|DDI|DAP)([FGHJKMNQUVXZ])(\d{2})$/i.exec(symbol.trim());
  if (!match) return null;

  const family = match[1].toUpperCase() as FixedIncomeCurveFamily;
  const month = MONTH_CODES[match[2].toUpperCase()];
  const year = 2000 + Number(match[3]);
  return family === 'DAP'
    ? followingBusinessDay(utcDate(year, month, 15))
    : firstBusinessDay(year, month);
}

export const maturityFromContractCode = contractMaturity;

export function curveDayCount(family: FixedIncomeCurveFamily): CurveDayCount {
  return family === 'DDI' ? 'ACT/360' : 'DU/252';
}

function timeToMaturity(
  family: FixedIncomeCurveFamily,
  asOf: Date,
  maturity: Date
): { days: number; yearFraction: number } {
  const days = family === 'DDI'
    ? calendarDaysBetween(asOf, maturity)
    : businessDaysBetween(asOf, maturity);
  return {
    days,
    yearFraction: days / (family === 'DDI' ? 360 : 252),
  };
}

export function discountFactor(
  family: FixedIncomeCurveFamily,
  rate: number,
  yearFraction: number
): number {
  if (yearFraction < 0 || rate <= -100) return Number.NaN;
  const decimalRate = rate / 100;
  return family === 'DDI'
    ? 1 / (1 + decimalRate * yearFraction)
    : Math.pow(1 + decimalRate, -yearFraction);
}

function rateFromDiscountFactor(
  family: FixedIncomeCurveFamily,
  discount: number,
  yearFraction: number
): number {
  if (discount <= 0 || yearFraction <= 0) return Number.NaN;
  return family === 'DDI'
    ? ((1 / discount - 1) / yearFraction) * 100
    : (Math.pow(discount, -1 / yearFraction) - 1) * 100;
}

export function interpolateLogLinear(
  points: readonly FixedIncomeCurvePoint[],
  yearFraction: number
): { rate: number; discountFactor: number } | null {
  const sorted = [...points]
    .filter((point) => point.yearFraction > 0 && point.discountFactor > 0)
    .sort((a, b) => a.yearFraction - b.yearFraction);
  if (sorted.length === 0) return null;

  const exact = sorted.find((point) => Math.abs(point.yearFraction - yearFraction) < 1e-10);
  if (exact) return { rate: exact.rate, discountFactor: exact.discountFactor };
  if (yearFraction < sorted[0].yearFraction || yearFraction > sorted[sorted.length - 1].yearFraction) {
    return null;
  }

  const upperIndex = sorted.findIndex((point) => point.yearFraction > yearFraction);
  if (upperIndex <= 0) return null;
  const lower = sorted[upperIndex - 1];
  const upper = sorted[upperIndex];
  const weight = (yearFraction - lower.yearFraction)
    / (upper.yearFraction - lower.yearFraction);
  const logDiscount = Math.log(lower.discountFactor)
    + weight * (Math.log(upper.discountFactor) - Math.log(lower.discountFactor));
  const interpolatedDiscount = Math.exp(logDiscount);

  return {
    discountFactor: interpolatedDiscount,
    rate: rateFromDiscountFactor(lower.family, interpolatedDiscount, yearFraction),
  };
}

/**
 * B3 Flat Forward 252. The accumulated factor between adjacent vertices is
 * raised pro rata by business days, keeping the annualized forward constant.
 */
export function interpolateFlatForward252(
  previous: FixedIncomeCurvePoint,
  next: FixedIncomeCurvePoint,
  targetBusinessDays: number
): { rate: number; discountFactor: number; forwardRate: number; weight: number } | null {
  const duPrevious = previous.days;
  const duNext = next.days;
  if (
    previous.family === 'DDI' ||
    next.family === 'DDI' ||
    targetBusinessDays < duPrevious ||
    targetBusinessDays > duNext ||
    duNext <= duPrevious ||
    targetBusinessDays <= 0
  ) return null;

  const previousFactor = Math.pow(1 + previous.rate / 100, duPrevious / 252);
  const nextFactor = Math.pow(1 + next.rate / 100, duNext / 252);
  const weight = (targetBusinessDays - duPrevious) / (duNext - duPrevious);
  const targetFactor =
    previousFactor * Math.pow(nextFactor / previousFactor, weight);
  const rate = (Math.pow(targetFactor, 252 / targetBusinessDays) - 1) * 100;
  const forwardRate =
    (Math.pow(nextFactor / previousFactor, 252 / (duNext - duPrevious)) - 1) * 100;

  if (![rate, forwardRate, targetFactor].every(Number.isFinite)) return null;
  return {
    rate,
    discountFactor: 1 / targetFactor,
    forwardRate,
    weight,
  };
}

export function interpolateCurveAtDate(
  curve: FixedIncomeCurve,
  targetDate: Date
): FlatForward252Result | null {
  if (curve.family === 'DDI') return null;
  const asOf = new Date(`${curve.asOf}T12:00:00Z`);
  const target = normalizeDate(targetDate);
  const businessDays = businessDaysBetween(asOf, target);
  const points = [...curve.points].sort((a, b) => a.days - b.days);
  const exact = points.find((point) => point.days === businessDays);
  if (exact) {
    return {
      targetDate: dateKey(target),
      businessDays,
      rate: exact.rate,
      discountFactor: exact.discountFactor,
      forwardRate: exact.rate,
      weight: 0,
      previous: exact,
      next: exact,
    };
  }
  const nextIndex = points.findIndex((point) => point.days > businessDays);
  if (nextIndex <= 0) return null;
  const previous = points[nextIndex - 1];
  const next = points[nextIndex];
  const interpolated = interpolateFlatForward252(previous, next, businessDays);
  if (!interpolated) return null;
  return {
    targetDate: dateKey(target),
    businessDays,
    ...interpolated,
    previous,
    next,
  };
}

function addBusinessDays(date: Date, businessDays: number): Date {
  let result = date;
  let remaining = businessDays;
  while (remaining > 0) {
    result = addDays(result, 1);
    if (isBrazilBusinessDay(result)) remaining -= 1;
  }
  return result;
}

function vertexDate(
  family: FixedIncomeCurveFamily,
  asOf: Date,
  years: number
): Date {
  return family === 'DDI'
    ? addDays(asOf, Math.round(years * 360))
    : addBusinessDays(asOf, Math.round(years * 252));
}

export function buildFixedIncomeCurve(
  family: FixedIncomeCurveFamily,
  snapshots: readonly B3Snapshot[],
  asOf: Date = saoPauloToday(),
  constantVertices: readonly ConstantMaturityVertex[] = CONSTANT_MATURITY_VERTICES
): FixedIncomeCurve {
  const valuationDate = normalizeDate(asOf);
  const prefix = family.toUpperCase();
  const points = snapshots.flatMap((snapshot): FixedIncomeCurvePoint[] => {
    if (
      !snapshot.status.ok
      || !snapshot.symbol.toUpperCase().startsWith(prefix)
      || snapshot.current == null
    ) return [];

    const maturity = contractMaturity(snapshot.symbol);
    if (!maturity || maturity <= valuationDate) return [];
    const time = timeToMaturity(family, valuationDate, maturity);
    const discount = discountFactor(family, snapshot.current, time.yearFraction);
    if (!Number.isFinite(discount) || discount <= 0) return [];

    return [{
      symbol: snapshot.symbol.toUpperCase(),
      family,
      maturityDate: dateKey(maturity),
      days: time.days,
      yearFraction: time.yearFraction,
      rate: snapshot.current,
      discountFactor: discount,
      source: 'snapshot',
      receivedAt: snapshot.receivedAt,
    }];
  }).sort((a, b) => a.yearFraction - b.yearFraction);

  const vertices = constantVertices.flatMap((vertex): FixedIncomeCurvePoint[] => {
    const target = vertexDate(family, valuationDate, vertex.years);
    const time = timeToMaturity(family, valuationDate, target);
    const nextIndex = points.findIndex((point) => point.days >= time.days);
    const previous = nextIndex > 0 ? points[nextIndex - 1] : null;
    const next = nextIndex >= 0 ? points[nextIndex] : null;
    const flatForward =
      family !== 'DDI' && previous && next
        ? interpolateFlatForward252(previous, next, time.days)
        : null;
    const interpolated =
      flatForward ?? interpolateLogLinear(points, vertex.years);
    if (!interpolated) return [];
    return [{
      symbol: vertex.label,
      family,
      maturityDate: dateKey(target),
      days: time.days,
      yearFraction: vertex.years,
      rate: interpolated.rate,
      discountFactor: interpolated.discountFactor,
      source: 'interpolated',
      receivedAt: null,
    }];
  });

  return {
    family,
    asOf: dateKey(valuationDate),
    dayCount: curveDayCount(family),
    points,
    vertices,
  };
}

export const buildCurve = buildFixedIncomeCurve;

export function buildFixedIncomeCurves(
  snapshots: readonly B3Snapshot[],
  asOf: Date = saoPauloToday(),
  constantVertices: readonly ConstantMaturityVertex[] = CONSTANT_MATURITY_VERTICES
): FixedIncomeCurves {
  return {
    DI1: buildFixedIncomeCurve('DI1', snapshots, asOf, constantVertices),
    DDI: buildFixedIncomeCurve('DDI', snapshots, asOf, constantVertices),
    DAP: buildFixedIncomeCurve('DAP', snapshots, asOf, constantVertices),
  };
}
