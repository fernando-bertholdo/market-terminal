export type BarrierExitReason =
  | 'STOP_LOSS'
  | 'TAKE_PROFIT'
  | 'TRAILING_STOP'
  | 'TIME_EXIT';

export interface BarrierConfig {
  stopLossPct: number;
  takeProfitPct: number;
  trailingStopPct: number;
  maxHoldingDays: number;
}

export interface PositionBarrier extends BarrierConfig {
  direction: 1 | -1;
  openedAt: string;
  entryPrice: number;
  bestPrice: number;
}

export interface BarrierLevels {
  stopPrice: number;
  takeProfitPrice: number;
  trailingStopPrice: number;
  trailingArmed: boolean;
  returnSinceEntryPct: number;
  holdingDays: number;
}

export interface BarrierEvaluation extends BarrierLevels {
  reason: BarrierExitReason | null;
  bestPrice: number;
}

export interface ReentryBlock {
  direction: 1 | -1;
  targetWeightAtExit: number;
  exitedAt: string;
  reason: BarrierExitReason;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const MIN_REENTRY_COOLDOWN_MS = 6 * 60 * 60 * 1000;
const FRESH_TARGET_CHANGE = 0.05;

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export function barrierConfigForVol(exAnteVol: number): BarrierConfig {
  const annualVol = Number.isFinite(exAnteVol) && exAnteVol > 0 ? exAnteVol : 0.15;
  const fiveDayVol = annualVol * Math.sqrt(5 / 252);
  const stopLossPct = clamp(2 * fiveDayVol, 0.015, 0.08);

  return {
    stopLossPct,
    takeProfitPct: clamp(1.75 * stopLossPct, 0.03, 0.15),
    trailingStopPct: clamp(1.25 * stopLossPct, 0.02, 0.10),
    maxHoldingDays: 30,
  };
}

export function createPositionBarrier(
  direction: 1 | -1,
  entryPrice: number,
  exAnteVol: number,
  openedAt: string
): PositionBarrier {
  return {
    direction,
    openedAt,
    entryPrice,
    bestPrice: entryPrice,
    ...barrierConfigForVol(exAnteVol),
  };
}

export function evaluateBarrier(
  barrier: PositionBarrier,
  price: number,
  nowIso: string
): BarrierEvaluation {
  const bestPrice =
    barrier.direction > 0
      ? Math.max(barrier.bestPrice, price)
      : Math.min(barrier.bestPrice, price);

  const signedReturn = barrier.direction * (price / barrier.entryPrice - 1);
  const favorableReturn =
    barrier.direction > 0
      ? bestPrice / barrier.entryPrice - 1
      : barrier.entryPrice / bestPrice - 1;
  const trailingArmed = favorableReturn >= barrier.stopLossPct;
  const holdingDays = Math.max(
    0,
    (new Date(nowIso).getTime() - new Date(barrier.openedAt).getTime()) / DAY_MS
  );

  const stopPrice =
    barrier.entryPrice * (1 - barrier.direction * barrier.stopLossPct);
  const takeProfitPrice =
    barrier.entryPrice * (1 + barrier.direction * barrier.takeProfitPct);
  const trailingStopPrice =
    bestPrice * (1 - barrier.direction * barrier.trailingStopPct);

  let reason: BarrierExitReason | null = null;
  if (signedReturn <= -barrier.stopLossPct) reason = 'STOP_LOSS';
  else if (
    trailingArmed &&
    (barrier.direction > 0 ? price <= trailingStopPrice : price >= trailingStopPrice)
  ) {
    reason = 'TRAILING_STOP';
  }

  return {
    reason,
    bestPrice,
    stopPrice,
    takeProfitPrice,
    trailingStopPrice,
    trailingArmed,
    returnSinceEntryPct: signedReturn * 100,
    holdingDays,
  };
}

export function isReentryBlocked(
  block: ReentryBlock | undefined,
  targetWeight: number,
  nowIso: string
): boolean {
  if (!block || Math.abs(targetWeight) < 0.005) return false;
  const direction = Math.sign(targetWeight) as 1 | -1;
  if (direction !== block.direction) return false;

  const elapsed = new Date(nowIso).getTime() - new Date(block.exitedAt).getTime();
  const materiallyChanged =
    Math.abs(targetWeight - block.targetWeightAtExit) >= FRESH_TARGET_CHANGE;
  return elapsed < MIN_REENTRY_COOLDOWN_MS || !materiallyChanged;
}

export const LIVE_BARRIER_POLICY = {
  volatilityHorizonDays: 5,
  stopVolMultiple: 2,
  takeProfitEnabled: false,
  takeProfitMultipleOfStop: null,
  trailingMultipleOfStop: 1.25,
  trailingArmsAfterStopDistance: true,
  timeExitEnabled: false,
  maxHoldingDays: null,
  minReentryCooldownHours: 6,
  freshTargetChangePctPoints: FRESH_TARGET_CHANGE * 100,
};
