/**
 * Money and points (design-system §8.2): MoneyText, CostBreakdown and
 * PointsBreakdown.
 */

import { TrendingUp } from "lucide-react";
import { cx } from "../cx";
import { currencySymbol, formatDate, formatForeign, formatNaira } from "./format";
import { SourceLine, type Source } from "./Source";

export type Foreign = { amount: number; currency: string };

/** ₦ first (ink), the foreign amount after it (muted), and the rate date when asked. */
export function MoneyText({
  naira,
  foreign,
  short = false,
  rate,
  className,
}: {
  naira: number;
  foreign?: Foreign;
  short?: boolean;
  /** Shown on the first money figure of a screen: "at ₦1,378/€ on 23 Sep". */
  rate?: { perUnit: number; currency: string; on: string };
  className?: string;
}) {
  return (
    <span className={cx("tabular-nums", className)}>
      <span className="font-semibold text-ink">{formatNaira(naira, { short })}</span>
      {foreign && (
        <span className="text-muted"> · {formatForeign(foreign.amount, foreign.currency)}</span>
      )}
      {rate && (
        <span className="block text-caption text-subtle">
          at {formatNaira(rate.perUnit)}/{currencySymbol(rate.currency)} on {formatDate(rate.on)}
        </span>
      )}
    </span>
  );
}

export type CostKind =
  "tuition" | "living" | "visa" | "tests" | "travel" | "proof_of_funds" | "other";

export type CostLine = {
  kind: CostKind;
  label: string;
  naira: number;
  foreign?: Foreign;
  source?: Source;
};

/** Segment colours: a quiet ramp of the accent and neutrals, never status colours. */
const SEGMENT: Record<CostKind, string> = {
  tuition: "bg-accent",
  living: "bg-accent-hover",
  visa: "bg-line-strong",
  tests: "bg-field-line",
  travel: "bg-muted",
  other: "bg-subtle",
  proof_of_funds: "bg-surface",
};

const HATCH = {
  backgroundImage:
    "repeating-linear-gradient(135deg, var(--line-strong) 0 2px, transparent 2px 6px)",
};

export function costTotals(lines: CostLine[]) {
  const spent = lines.filter((line) => line.kind !== "proof_of_funds");
  const shown = lines.filter((line) => line.kind === "proof_of_funds");
  const sum = (items: CostLine[]) => items.reduce((total, line) => total + line.naira, 0);
  return { spent: sum(spent), shown: sum(shown) };
}

export function CostBreakdown({
  lines,
  title = "Total cost",
}: {
  lines: CostLine[];
  title?: string;
}) {
  const { spent, shown } = costTotals(lines);
  const all = spent + shown || 1;
  return (
    <section aria-label={title} className="space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-h4 text-ink">{title}</h3>
        <span className="text-metric tabular-nums text-ink">{formatNaira(spent)}</span>
      </div>
      <div aria-hidden className="flex h-3 overflow-hidden rounded-full border border-line">
        {lines.map((line) => (
          <span
            key={line.label}
            className={cx("h-full", SEGMENT[line.kind])}
            style={{
              width: `${(line.naira / all) * 100}%`,
              ...(line.kind === "proof_of_funds" ? HATCH : {}),
            }}
          />
        ))}
      </div>
      <ul className="divide-y divide-line">
        {lines.map((line) => (
          <li key={line.label} className="flex items-start gap-3 py-2">
            <span
              aria-hidden
              className={cx(
                "mt-1.5 size-3 shrink-0 rounded-[3px] border border-line",
                SEGMENT[line.kind],
              )}
              style={line.kind === "proof_of_funds" ? HATCH : undefined}
            />
            <span className="min-w-0 flex-1">
              <span className="block text-body text-ink">
                {line.label}
                {line.kind === "proof_of_funds" && (
                  <span className="text-muted"> — shown, not spent</span>
                )}
              </span>
              {line.source && <SourceLine source={line.source} />}
            </span>
            <MoneyText naira={line.naira} foreign={line.foreign} className="text-right" />
          </li>
        ))}
      </ul>
      {shown > 0 && (
        <p className="text-body-s text-muted">
          The total leaves out {formatNaira(shown)} of proof of funds: money you must show in your
          account, not spend.
        </p>
      )}
    </section>
  );
}

export type PointsFactor = { label: string; points: number; max?: number; from?: string };
export type WhatIf = { label: string; delta: number };

export function PointsBreakdown({
  scheme,
  factors,
  threshold,
  whatIfs = [],
  source,
}: {
  scheme: string;
  factors: PointsFactor[];
  threshold?: { points: number; label: string };
  whatIfs?: WhatIf[];
  source?: Source;
}) {
  const total = factors.reduce((sum, factor) => sum + factor.points, 0);
  const gap = threshold ? threshold.points - total : 0;
  return (
    <section aria-label={`${scheme} points`} className="space-y-4">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-overline text-muted uppercase">{scheme}</p>
          <p className="text-metric-xl tabular-nums text-ink">{total}</p>
        </div>
        {threshold && (
          <p className={cx("text-right text-body-s", gap > 0 ? "text-warning" : "text-success")}>
            <span className="block font-semibold">
              {gap > 0 ? `${gap} below ${threshold.label}` : `${-gap} above ${threshold.label}`}
            </span>
            <span className="text-muted">
              {threshold.label}: <span className="tabular-nums">{threshold.points}</span>
            </span>
          </p>
        )}
      </div>
      <ul className="divide-y divide-line">
        {factors.map((factor) => (
          <li key={factor.label} className="flex items-baseline gap-3 py-2">
            <span className="min-w-0 flex-1">
              <span className="block text-body text-ink">{factor.label}</span>
              {factor.from && (
                <span className="block text-caption text-subtle">From: {factor.from}</span>
              )}
            </span>
            <span className="text-metric-s tabular-nums text-ink">
              {factor.points}
              {factor.max !== undefined && <span className="text-muted"> / {factor.max}</span>}
            </span>
          </li>
        ))}
      </ul>
      {whatIfs.length > 0 && (
        <ul
          className="space-y-1.5 rounded-r-md border border-info-line bg-info-bg p-3"
          aria-label="What would add points"
        >
          {whatIfs.map((whatIf) => (
            <li key={whatIf.label} className="flex items-center gap-2 text-body-s text-info">
              <TrendingUp aria-hidden className="size-4 shrink-0" />
              <span>
                <span className="font-semibold tabular-nums">+{whatIf.delta}</span> if{" "}
                {whatIf.label}
              </span>
            </li>
          ))}
        </ul>
      )}
      {source && <SourceLine source={source} />}
    </section>
  );
}
