/**
 * Formatting rules from design-system §4.3: money, dates and relative days.
 * One place, so every figure on every screen reads the same way.
 */

/** ₦1,450,000 in full (tables, totals); ₦1.45m / ₦950k in cards (`short`). */
export function formatNaira(amount: number, { short = false }: { short?: boolean } = {}): string {
  const sign = amount < 0 ? "−" : "";
  const value = Math.abs(amount);
  if (short) {
    if (value >= 1_000_000_000) return `${sign}₦${trim(value / 1_000_000_000)}bn`;
    if (value >= 1_000_000) return `${sign}₦${trim(value / 1_000_000)}m`;
    if (value >= 10_000) return `${sign}₦${Math.round(value / 1_000)}k`;
  }
  return `${sign}₦${Math.round(value).toLocaleString("en-NG")}`;
}

/** Up to two decimals, no trailing zeros: 1.45, 14.2, 3. */
function trim(value: number): string {
  return (Math.round(value * 100) / 100).toString();
}

/** €1,091 / £30,000 / $2,000: the foreign amount beside a naira figure. */
export function formatForeign(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

/** €, £, $: the currency's own symbol. */
export function currencySymbol(currency: string): string {
  const part = new Intl.NumberFormat("en-GB", { style: "currency", currency })
    .formatToParts(0)
    .find((item) => item.type === "currency");
  return part?.value ?? currency;
}

/** 23 Sep 2026 */
export function formatDate(value: string | Date): string {
  return new Date(value).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Whole calendar days from `from` to `to` (local dates), negative when past. */
export function daysBetween(to: string | Date, from: Date = new Date()): number {
  const end = new Date(to);
  const a = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
  const b = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
  return Math.round((b - a) / 86_400_000);
}

/** "today", "tomorrow", "in 9 days", "yesterday", "3 days ago". */
export function relativeDays(days: number): string {
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  if (days === -1) return "yesterday";
  return days > 0 ? `in ${days} days` : `${-days} days ago`;
}
