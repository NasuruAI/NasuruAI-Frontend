/**
 * Trust and fit components (design-system §8.2): TrustMeter, CheckList,
 * FitScore, WhyRankPanel and ScamVerdict.
 */

import {
  CircleCheck,
  CircleMinus,
  CircleX,
  OctagonAlert,
  Shield,
  ShieldAlert,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";
import { cx } from "../cx";
import { SourceLine, type Source } from "./Source";

export type TrustBand = "high" | "verified" | "caution";

/** ≥ 80 high, 60-79 verified, 40-59 caution; under 40 is never shown. */
export function trustBand(score: number): TrustBand | null {
  if (score >= 80) return "high";
  if (score >= 60) return "verified";
  if (score >= 40) return "caution";
  return null;
}

const BAND = {
  high: { label: "High trust", text: "text-success", fill: "bg-success", Icon: ShieldCheck },
  verified: { label: "Verified", text: "text-ink", fill: "bg-ink", Icon: Shield },
  caution: { label: "Caution", text: "text-warning", fill: "bg-warning", Icon: ShieldAlert },
} as const;

export function TrustMeter({ score, compact = false }: { score: number; compact?: boolean }) {
  const band = trustBand(score);
  if (!band) return null;
  const { label, text, fill, Icon } = BAND[band];
  const filled = Math.round(score / 10);
  return (
    <div
      role="img"
      aria-label={`Trust ${score} out of 100, ${label.toLowerCase()}`}
      className="inline-flex items-center gap-2"
    >
      <Icon aria-hidden className={cx("size-4", text)} />
      <span className={cx(compact ? "text-metric-s" : "text-metric", "tabular-nums", text)}>
        {score}
      </span>
      {!compact && (
        <span aria-hidden className="flex gap-0.5">
          {Array.from({ length: 10 }, (_, index) => (
            <span
              key={index}
              className={cx("h-2 w-2.5 rounded-[2px]", index < filled ? fill : "bg-line")}
            />
          ))}
        </span>
      )}
      <span className={cx("text-body-s font-semibold", text)}>{label}</span>
    </div>
  );
}

export type Check = {
  name: string;
  outcome: "pass" | "fail" | "unknown";
  evidence: string;
  source?: Source;
};

const OUTCOME = {
  fail: { Icon: CircleX, className: "text-danger", word: "Failed" },
  unknown: { Icon: CircleMinus, className: "text-muted", word: "Not known yet" },
  pass: { Icon: CircleCheck, className: "text-success", word: "Passed" },
} as const;
const ORDER = { fail: 0, unknown: 1, pass: 2 } as const;

/** Failed checks first: they are what someone needs to see. */
export function CheckList({ checks }: { checks: Check[] }) {
  const sorted = [...checks].sort((a, b) => ORDER[a.outcome] - ORDER[b.outcome]);
  return (
    <ul className="divide-y divide-line">
      {sorted.map((check) => {
        const { Icon, className, word } = OUTCOME[check.outcome];
        return (
          <li key={check.name} className="flex gap-3 py-3">
            <Icon aria-hidden className={cx("mt-0.5 size-5 shrink-0", className)} />
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-ink">
                {check.name}
                <span className="sr-only">: {word}</span>
              </p>
              <p className="text-body-s text-muted">{check.evidence}</p>
              {check.source && <SourceLine source={check.source} className="mt-1" />}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function FitScore({
  score,
  reasons,
  onWhy,
}: {
  score: number;
  reasons: string[];
  onWhy?: () => void;
}) {
  return (
    <div className="space-y-2">
      <p className="flex items-baseline gap-1.5">
        <span className="text-metric tabular-nums text-ink">{score}</span>
        <span className="text-body-s font-semibold text-muted">fit</span>
        {onWhy && (
          <button
            type="button"
            onClick={onWhy}
            className="ml-2 text-body-s font-semibold text-accent underline underline-offset-3"
          >
            Why this rank
          </button>
        )}
      </p>
      {reasons.length > 0 && (
        <ul className="flex flex-wrap gap-1.5" aria-label="Top reasons">
          {reasons.slice(0, 3).map((reason) => (
            <li
              key={reason}
              className="rounded-full border border-line bg-sunken px-2.5 py-0.5 text-caption text-muted"
            >
              {reason}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export type RankFactor = { label: string; points: number; max: number; detail: string };
export type HardFilter = { label: string; passed: boolean; detail: string };

/** Plain-language factors with their weights as bars, and the hard filters. */
export function WhyRankPanel({
  factors,
  filters,
}: {
  factors: RankFactor[];
  filters: HardFilter[];
}) {
  return (
    <div className="space-y-5">
      <ul className="space-y-3">
        {factors.map((factor) => {
          const percent = Math.round((factor.points / Math.max(factor.max, 1)) * 100);
          return (
            <li key={factor.label}>
              <div className="flex items-baseline justify-between gap-3">
                <span className="font-semibold text-ink">{factor.label}</span>
                <span className="text-metric-s tabular-nums text-muted">
                  {factor.points} / {factor.max}
                </span>
              </div>
              <div aria-hidden className="mt-1 h-1.5 overflow-hidden rounded-full bg-sunken">
                <div className="h-full rounded-full bg-accent" style={{ width: `${percent}%` }} />
              </div>
              <p className="mt-1 text-body-s text-muted">{factor.detail}</p>
            </li>
          );
        })}
      </ul>
      {filters.length > 0 && (
        <div>
          <h3 className="mb-1 text-h4 text-ink">Must-haves</h3>
          <ul>
            {filters.map((filter) => (
              <li key={filter.label} className="flex items-start gap-2 py-1.5">
                {filter.passed ? (
                  <CircleCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-success" />
                ) : (
                  <CircleX aria-hidden className="mt-0.5 size-4 shrink-0 text-danger" />
                )}
                <span className="text-body-s text-ink">
                  <span className="font-semibold">{filter.label}</span>
                  <span className="sr-only">{filter.passed ? ": met" : ": not met"}</span> —{" "}
                  {filter.detail}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export type Verdict = "genuine" | "caution" | "scam";

const VERDICT = {
  genuine: {
    title: "Looks genuine",
    box: "border-success-line bg-success-bg text-success",
    Icon: ShieldCheck,
  },
  caution: {
    title: "Caution",
    box: "border-warning-line bg-warning-bg text-warning",
    Icon: TriangleAlert,
  },
  scam: { title: "Likely scam", box: "border-danger bg-danger text-on-danger", Icon: OctagonAlert },
} as const;

export type ReportRoute = { label: string; href: string; detail?: string };

/**
 * The verdict band, the checks behind it, and what to do now. The report
 * routes (EFCC, NAPTIP) come from the API's sourced facts, never from code,
 * so a changed hotline is corrected in one place and carries its source.
 */
export function ScamVerdict({
  verdict,
  summary,
  checks,
  reportRoutes = [],
  actions,
}: {
  verdict: Verdict;
  summary: string;
  checks: Check[];
  reportRoutes?: ReportRoute[];
  actions?: React.ReactNode;
}) {
  const { title, box, Icon } = VERDICT[verdict];
  const scam = verdict === "scam";
  return (
    <section className="overflow-hidden rounded-r-lg border border-line">
      <header className={cx("flex items-start gap-3 border-b px-5 py-4", box)}>
        <Icon aria-hidden className="mt-0.5 size-6 shrink-0" />
        <div>
          <h2 className="font-display text-h2">{title}</h2>
          <p className={cx("text-body", scam ? "text-on-danger" : "text-ink")}>{summary}</p>
        </div>
      </header>
      <div className="px-5">
        <CheckList checks={checks} />
      </div>
      {(scam || actions) && (
        <div className="space-y-3 border-t border-line bg-sunken px-5 py-4">
          <h3 className="text-h4 text-ink">What to do now</h3>
          {scam && (
            <ul className="list-disc space-y-1 pl-5 text-body-s text-ink">
              <li>Don&apos;t pay anything, and don&apos;t send documents or passport details.</li>
              {reportRoutes.map((route) => (
                <li key={route.href}>
                  <a
                    href={route.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold underline underline-offset-3"
                  >
                    {route.label}
                    <span className="sr-only"> (opens in a new tab)</span>
                  </a>
                  {route.detail && ` — ${route.detail}`}
                </li>
              ))}
            </ul>
          )}
          {actions}
        </div>
      )}
    </section>
  );
}
