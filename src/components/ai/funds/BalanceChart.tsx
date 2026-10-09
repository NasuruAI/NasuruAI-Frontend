"use client";

/**
 * The funds checker's coverage bar and balance line chart (web.md §11.4): a
 * hand-rolled inline SVG, matching how every other chart-shaped thing in
 * this design system (Timeline, ProgressBar) is built — no charting library.
 */

import { type DailyBalance, longestRun } from "@/lib/ai/funds";
import { cx } from "../cx";
import { formatDate, formatForeign } from "../evidence/format";

/** The statement period, with the longest consecutive run of covered days highlighted. */
export function CoverageBar({
  series,
  neededDays,
}: {
  series: DailyBalance[];
  neededDays?: number;
}) {
  if (!series.length) return null;
  const start = series[0].date;
  const end = series[series.length - 1].date;
  const totalDays = Math.max(
    1,
    Math.round((new Date(end).getTime() - new Date(start).getTime()) / 86_400_000) + 1,
  );
  const run = longestRun(series);
  const covered = new Set(series.map((d) => d.date));
  const segments: { from: number; width: number }[] = [];
  let segmentStart: number | null = null;
  for (let i = 0; i < totalDays; i++) {
    const day = new Date(start);
    day.setUTCDate(day.getUTCDate() + i);
    const has = covered.has(day.toISOString().slice(0, 10));
    if (has && segmentStart === null) segmentStart = i;
    if (!has && segmentStart !== null) {
      segments.push({ from: segmentStart, width: i - segmentStart });
      segmentStart = null;
    }
  }
  if (segmentStart !== null) segments.push({ from: segmentStart, width: totalDays - segmentStart });

  return (
    <div>
      <div className="flex items-center justify-between text-caption text-subtle">
        <span>{formatDate(start)}</span>
        <span>{formatDate(end)}</span>
      </div>
      <div className="relative mt-1 h-3 overflow-hidden rounded-full bg-sunken">
        {segments.map((segment) => (
          <div
            key={segment.from}
            className="absolute inset-y-0 bg-accent"
            style={{
              left: `${(segment.from / totalDays) * 100}%`,
              width: `${(segment.width / totalDays) * 100}%`,
            }}
          />
        ))}
      </div>
      {run && (
        <p className="mt-1.5 text-body-s text-muted">
          Longest run: <span className="font-semibold text-ink">{run.days} consecutive days</span>
          {neededDays !== undefined && ` (the rule asks for ${neededDays})`}
        </p>
      )}
    </div>
  );
}

/** Daily balance over the statement period, with the required amount as a threshold line. */
export function BalanceChart({
  series,
  currency,
  threshold,
}: {
  series: DailyBalance[];
  currency: string;
  threshold?: number;
}) {
  if (series.length < 2) return null;
  const width = 600;
  const height = 160;
  const padding = { top: 12, right: 8, bottom: 8, left: 8 };
  const values = series.map((d) => d.balance);
  const lo = Math.min(...values, threshold ?? Infinity);
  const hi = Math.max(...values, threshold ?? -Infinity);
  const span = hi - lo || 1;
  const x = (i: number) =>
    padding.left + (i / (series.length - 1)) * (width - padding.left - padding.right);
  const y = (value: number) =>
    height - padding.bottom - ((value - lo) / span) * (height - padding.top - padding.bottom);

  const path = series
    .map((point, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(point.balance).toFixed(1)}`)
    .join(" ");
  const area = `${path} L${x(series.length - 1).toFixed(1)},${height - padding.bottom} L${x(0)},${height - padding.bottom} Z`;
  const below = threshold !== undefined && Math.min(...values) < threshold;

  return (
    <div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`Balance from ${formatForeign(series[0].balance, currency)} to ${formatForeign(series[series.length - 1].balance, currency)}`}
        className="w-full"
        preserveAspectRatio="none"
      >
        <path d={area} className="fill-accent-soft" />
        {threshold !== undefined && (
          <line
            x1={padding.left}
            x2={width - padding.right}
            y1={y(threshold)}
            y2={y(threshold)}
            className={cx("stroke-2", below ? "stroke-danger" : "stroke-success")}
            strokeDasharray="4 3"
          />
        )}
        <path d={path} fill="none" className="stroke-accent" strokeWidth={2} />
      </svg>
      <div className="mt-1 flex items-center justify-between text-caption text-subtle">
        <span>{formatDate(series[0].date)}</span>
        {threshold !== undefined && (
          <span className={below ? "text-danger" : "text-success"}>
            Required: {formatForeign(threshold, currency)}
          </span>
        )}
        <span>{formatDate(series[series.length - 1].date)}</span>
      </div>
    </div>
  );
}
