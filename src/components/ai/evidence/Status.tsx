/**
 * Status components (design-system §8.2): StatusPill, CountdownChip,
 * QuotaMeter and UpgradeCard.
 */

import {
  Ban,
  CalendarClock,
  CircleCheck,
  CircleDashed,
  CircleX,
  ClockAlert,
  PenLine,
  Sparkles,
} from "lucide-react";
import { Pill, type Tone } from "../Chip";
import { cx } from "../cx";
import { daysBetween, formatDate, relativeDays } from "./format";

/** The meanings in design-system §3.4, keyed by the API's values. */
export type StatusKind =
  "eligible" | "eligible_if" | "not_eligible" | "blocked" | "stale" | "you_answer";

const STATUS: Record<StatusKind, { tone: Tone; Icon: typeof Ban; word: string; solid?: boolean }> =
  {
    eligible: { tone: "success", Icon: CircleCheck, word: "Eligible" },
    eligible_if: { tone: "info", Icon: CircleDashed, word: "Eligible if…" },
    // "Not eligible yet": the honest result, never final; the gap comes with it.
    not_eligible: { tone: "danger", Icon: CircleX, word: "Not eligible yet" },
    blocked: { tone: "danger", Icon: Ban, word: "Blocked for your nationality", solid: true },
    stale: { tone: "warning", Icon: ClockAlert, word: "Awaiting re-check" },
    you_answer: { tone: "warning", Icon: PenLine, word: "You answer" },
  };

export function StatusPill({ status, className }: { status: StatusKind; className?: string }) {
  const { tone, Icon, word, solid } = STATUS[status];
  return (
    <Pill
      tone={tone}
      solid={solid}
      icon={<Icon aria-hidden className="size-3.5" />}
      className={className}
    >
      {word}
    </Pill>
  );
}

/** Deadline tone: warning within 14 days, danger within 3, neutral when past. */
export function countdownTone(days: number): "neutral" | "warning" | "danger" {
  if (days < 0) return "neutral";
  if (days <= 3) return "danger";
  if (days <= 14) return "warning";
  return "neutral";
}

export function CountdownChip({ date, now, label }: { date: string; now?: Date; label?: string }) {
  const days = daysBetween(date, now);
  const tone = countdownTone(days);
  const past = days < 0;
  return (
    <span
      className={cx(
        "inline-flex items-start gap-1.5 rounded-r-sm px-2 py-1",
        tone === "neutral" && "bg-sunken text-muted",
        tone === "warning" && "bg-warning-bg text-warning",
        tone === "danger" && "bg-danger-bg text-danger",
      )}
    >
      <CalendarClock aria-hidden className="mt-0.5 size-3.5 shrink-0" />
      <span className="leading-tight">
        <span className="block text-caption font-semibold">
          {label && `${label} `}
          {past ? `closed ${relativeDays(days)}` : relativeDays(days)}
        </span>
        <span className="block text-caption opacity-90">{formatDate(date)}</span>
      </span>
    </span>
  );
}

/** "2 of 3 free answer packs this month": shown before the action, never after. */
export function QuotaMeter({
  used,
  limit,
  noun,
  period = "this month",
}: {
  used: number;
  /** null: unlimited. */
  limit: number | null;
  noun: string;
  period?: string;
}) {
  if (limit === null) {
    return (
      <p className="text-body-s text-muted">
        Unlimited {noun} {period} · <span className="text-metric-s tabular-nums">{used}</span> used
      </p>
    );
  }
  const full = used >= limit;
  const percent = Math.min(100, Math.round((used / Math.max(limit, 1)) * 100));
  return (
    <div className="space-y-1">
      <p className={cx("text-body-s", full ? "text-danger" : "text-muted")}>
        <span className="text-metric-s tabular-nums text-ink">{used}</span> of{" "}
        <span className="text-metric-s tabular-nums text-ink">{limit}</span> {noun} {period}
        {full && " — you've used them all"}
      </p>
      <div
        role="meter"
        aria-label={`${used} of ${limit} ${noun} ${period}`}
        aria-valuemin={0}
        aria-valuemax={limit}
        aria-valuenow={Math.min(used, limit)}
        className="h-1 overflow-hidden rounded-full bg-sunken"
      >
        <div
          className={cx("h-full rounded-full", full ? "bg-danger" : "bg-accent")}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

/** What you'd get, where you hit the wall. Never covers content already seen. */
export function UpgradeCard({
  title,
  benefits,
  action,
}: {
  title: string;
  benefits: string[];
  action: React.ReactNode;
}) {
  return (
    <section className="rounded-r-lg border border-line bg-surface p-5 shadow-e1">
      <p className="flex items-center gap-2 font-display text-h3 text-ink">
        <Sparkles aria-hidden className="size-5 text-accent" />
        {title}
      </p>
      <ul className="mt-3 space-y-1.5">
        {benefits.map((benefit) => (
          <li key={benefit} className="flex items-start gap-2 text-body text-ink">
            <CircleCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-success" />
            {benefit}
          </li>
        ))}
      </ul>
      <div className="mt-4">{action}</div>
    </section>
  );
}
