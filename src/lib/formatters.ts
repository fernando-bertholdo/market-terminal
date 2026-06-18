// ─── FICC Market Terminal — Number Formatting Utilities ──────────────────────
// All functions are pure, side-effect-free, and safe with null/undefined input.

// ─── Internal helpers ─────────────────────────────────────────────────────────

function isValid(n: unknown): n is number {
  return typeof n === "number" && isFinite(n) && !isNaN(n);
}

function sign(n: number): "+" | "-" | "" {
  if (n > 0) return "+";
  if (n < 0) return "-";
  return "";
}

// ─── Yield formatting ─────────────────────────────────────────────────────────

/**
 * Format a yield value (e.g., 10.45 → "10.45%").
 * Used for SELIC, DI futures, US Treasuries.
 *
 * @param n        - The yield as a percentage (e.g., 10.45 for 10.45%)
 * @param decimals - Number of decimal places (default: 2)
 */
export function formatYield(n: unknown, decimals = 2): string {
  if (!isValid(n)) return "---";
  return `${n.toFixed(decimals)}%`;
}

/**
 * Format a yield change in basis points (e.g., -12.5 → "-12.5bp").
 *
 * @param bps - Change in basis points
 */
export function formatYieldChange(bps: unknown): string {
  if (!isValid(bps)) return "---";
  const s = sign(bps);
  return `${s}${Math.abs(bps).toFixed(1)}bp`;
}

// ─── Price formatting ──────────────────────────────────────────────────────────

/**
 * Format a generic price (e.g., 1.2345 → "1.2345" or 83_500 → "83,500").
 *
 * @param n        - The price value
 * @param decimals - Decimal places (default: 2)
 * @param group    - Whether to use thousands separator (default: true)
 */
export function formatPrice(
  n: unknown,
  decimals = 2,
  group = true
): string {
  if (!isValid(n)) return "---";
  return n.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    useGrouping: group,
  });
}

/**
 * Format FX rate with appropriate precision.
 * 4 decimals for major pairs, 2 for USD/BRL-style.
 *
 * @param n      - The exchange rate
 * @param isBRL  - Use 4 decimals for majors, 4 for BRL pairs too
 */
export function formatFX(n: unknown, decimals = 4): string {
  if (!isValid(n)) return "---";
  return n.toFixed(decimals);
}

/**
 * Format a commodities price (e.g., WTI at 82.34 → "82.34").
 * Shows 2 decimals for USD-denominated, 0 for index points.
 */
export function formatCommodity(n: unknown, decimals = 2): string {
  if (!isValid(n)) return "---";
  return formatPrice(n, decimals, true);
}

/**
 * Format index points (e.g., 131_450.7 → "131,450").
 */
export function formatIndex(n: unknown): string {
  if (!isValid(n)) return "---";
  return formatPrice(n, 0, true);
}

// ─── Change / delta formatting ────────────────────────────────────────────────

/**
 * Format a percentage change with optional sign prefix.
 * e.g., -0.0123 → "-1.23%" or 0.0045 → "+0.45%"
 *
 * @param pct      - The change as a decimal (0.0123 = 1.23%) OR as a percentage
 * @param asDecimal - If true (default), multiply by 100 before display
 * @param showSign  - Whether to show + for positive (default: true)
 * @param decimals  - Decimal places (default: 2)
 */
export function formatChange(
  pct: unknown,
  asDecimal = true,
  showSign = true,
  decimals = 2
): string {
  if (!isValid(pct)) return "---";
  const val = asDecimal ? pct * 100 : pct;
  const s = showSign ? sign(val) : val < 0 ? "-" : "";
  return `${s}${Math.abs(val).toFixed(decimals)}%`;
}

/**
 * Format a basis points value (e.g., 125 → "125bp" or -12 → "-12bp").
 *
 * @param n        - Basis points value
 * @param decimals - Decimal places (default: 1)
 * @param showSign - Prefix sign for positive values (default: true)
 */
export function formatBps(
  n: unknown,
  decimals = 1,
  showSign = true
): string {
  if (!isValid(n)) return "---";
  const s = showSign ? sign(n) : n < 0 ? "-" : "";
  return `${s}${Math.abs(n).toFixed(decimals)}bp`;
}

/**
 * Format an absolute price change with sign.
 * e.g., -0.42 → "-0.42" or 1.55 → "+1.55"
 */
export function formatAbsChange(
  n: unknown,
  decimals = 2,
  showSign = true
): string {
  if (!isValid(n)) return "---";
  const s = showSign ? sign(n) : n < 0 ? "-" : "";
  return `${s}${Math.abs(n).toFixed(decimals)}`;
}

// ─── Time / date formatting ────────────────────────────────────────────────────

/**
 * Format a date/timestamp for display in panel headers.
 * Returns "HH:MM:SS" in local time.
 *
 * @param date - Date object, ISO string, or epoch ms
 */
export function formatTime(date: Date | string | number | null | undefined): string {
  if (date == null) return "--:--:--";
  try {
    const d = date instanceof Date ? date : new Date(date);
    if (!isFinite(d.getTime())) return "--:--:--";
    return d.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  } catch {
    return "--:--:--";
  }
}

/**
 * Format a date as "DD MMM" (e.g., "03 May").
 */
export function formatDate(date: Date | string | number | null | undefined): string {
  if (date == null) return "--- ---";
  try {
    const d = date instanceof Date ? date : new Date(date);
    if (!isFinite(d.getTime())) return "--- ---";
    return d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
    });
  } catch {
    return "--- ---";
  }
}

/**
 * Format timestamp as relative time (e.g., "2m ago", "just now").
 *
 * @param date - The reference timestamp
 */
export function formatRelativeTime(
  date: Date | string | number | null | undefined
): string {
  if (date == null) return "---";
  try {
    const d = date instanceof Date ? date : new Date(date);
    if (!isFinite(d.getTime())) return "---";
    const diffSec = Math.floor((Date.now() - d.getTime()) / 1000);
    if (diffSec < 5) return "just now";
    if (diffSec < 60) return `${diffSec}s ago`;
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    return formatDate(d);
  } catch {
    return "---";
  }
}

// ─── Volume / large number formatting ────────────────────────────────────────

/**
 * Compact format for large numbers (e.g., 1_500_000 → "1.5M").
 */
export function formatCompact(n: unknown): string {
  if (!isValid(n)) return "---";
  const abs = Math.abs(n);
  const s = n < 0 ? "-" : "";
  if (abs >= 1_000_000_000) return `${s}${(abs / 1_000_000_000).toFixed(2)}B`;
  if (abs >= 1_000_000) return `${s}${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${s}${(abs / 1_000).toFixed(1)}K`;
  return `${s}${abs.toFixed(2)}`;
}

// ─── Color helpers ─────────────────────────────────────────────────────────────

/**
 * Return the CSS color class for a numeric change.
 * Used for className props on data cells.
 */
export function changeColor(n: unknown): string {
  if (!isValid(n) || n === 0) return "text-neutral";
  return n > 0 ? "text-up" : "text-down";
}

/**
 * Return the CSS color class based on sign, with optional intensity.
 * @param n    - The value to evaluate
 * @param mode - "class" returns Tailwind class, "hex" returns hex color
 */
export function signColor(
  n: unknown,
  mode: "class" | "hex" = "class"
): string {
  if (!isValid(n) || n === 0) {
    return mode === "class" ? "text-neutral" : "#e8ecf4";
  }
  if (n > 0) return mode === "class" ? "text-up" : "#34c98e";
  return mode === "class" ? "text-down" : "#f0647a";
}

// ─── Spread formatting ────────────────────────────────────────────────────────

/**
 * Format a spread value for EMBI+ or credit spreads.
 * e.g., 215 → "215bp"
 */
export function formatSpread(bps: unknown): string {
  if (!isValid(bps)) return "---";
  return `${Math.round(bps)}bp`;
}

// ─── Precision helpers ────────────────────────────────────────────────────────

/**
 * Infer appropriate decimal places for a given asset type.
 */
export function inferDecimals(
  assetType: "yield" | "fx" | "commodity" | "index" | "spread"
): number {
  switch (assetType) {
    case "yield": return 2;
    case "fx": return 4;
    case "commodity": return 2;
    case "index": return 0;
    case "spread": return 0;
    default: return 2;
  }
}
