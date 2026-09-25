/**
 * Journey components (design-system §8.2): Timeline, GapItem, TaskProgress.
 */

import { Check, CircleDashed, Flag as FlagIcon, Loader2, Plus } from "lucide-react";
import { Button } from "../Button";
import { cx } from "../cx";
import { formatNaira } from "./format";

export type TimelineStep = {
  title: string;
  /** e.g. "Oct 2026", or a duration ("18 months"). */
  when?: string;
  naira?: number;
  status: "done" | "current" | "future";
  /** The step that leads to permanent residence. */
  leadsToPr?: boolean;
};

export function Timeline({
  steps,
  orientation = "vertical",
}: {
  steps: TimelineStep[];
  orientation?: "vertical" | "horizontal";
}) {
  const current = steps.findIndex((step) => step.status === "current");
  if (orientation === "horizontal") {
    return (
      <div>
        <ol className="flex items-center" aria-label="Pathway steps">
          {steps.map((step, index) => (
            <li
              key={step.title}
              className={cx("flex items-center", index < steps.length - 1 && "flex-1")}
            >
              <span
                aria-current={step.status === "current" ? "step" : undefined}
                title={step.title}
                className={cx(
                  "flex size-4 shrink-0 items-center justify-center rounded-full border-2",
                  step.status === "done" && "border-accent bg-accent",
                  step.status === "current" && "border-accent bg-surface",
                  step.status === "future" && "border-line bg-surface",
                )}
              >
                <span className="sr-only">
                  {step.title} (
                  {step.status === "done"
                    ? "done"
                    : step.status === "current"
                      ? "current"
                      : "to come"}
                  )
                </span>
              </span>
              {index < steps.length - 1 && (
                <span
                  aria-hidden
                  className={cx(
                    "mx-1 h-0.5 flex-1",
                    step.status === "done" ? "bg-accent" : "bg-line",
                  )}
                />
              )}
            </li>
          ))}
        </ol>
        {current >= 0 && (
          <p className="mt-2 text-body-s text-muted">
            Step {current + 1} of {steps.length}:{" "}
            <span className="font-semibold text-ink">{steps[current].title}</span>
          </p>
        )}
      </div>
    );
  }
  return (
    <ol aria-label="Pathway steps">
      {steps.map((step, index) => (
        <li key={step.title} className="relative flex gap-4 pb-6 last:pb-0">
          {index < steps.length - 1 && (
            <span
              aria-hidden
              className={cx(
                "absolute top-6 bottom-0 left-[11px] w-0.5",
                step.status === "done" ? "bg-accent" : "bg-line",
              )}
            />
          )}
          <span
            aria-hidden
            className={cx(
              "relative z-10 flex size-6 shrink-0 items-center justify-center rounded-full border-2",
              step.status === "done" && "border-accent bg-accent text-on-accent",
              step.status === "current" && "border-accent bg-surface text-accent",
              step.status === "future" && "border-line bg-surface text-subtle",
            )}
          >
            {step.status === "done" ? (
              <Check className="size-3.5" />
            ) : (
              <span className="text-caption font-semibold">{index + 1}</span>
            )}
          </span>
          <div
            aria-current={step.status === "current" ? "step" : undefined}
            className="min-w-0 flex-1"
          >
            <p
              className={cx("font-semibold", step.status === "future" ? "text-muted" : "text-ink")}
            >
              {step.title}
              {step.leadsToPr && (
                <span className="ml-2 inline-flex items-center gap-1 text-caption font-semibold text-accent">
                  <FlagIcon aria-hidden className="size-3.5" /> Leads to permanent residence
                </span>
              )}
            </p>
            <p className="text-body-s text-muted">
              {[
                step.when,
                step.naira !== undefined ? formatNaira(step.naira, { short: true }) : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}

export type Gap = {
  what: string;
  why: string;
  how: string;
  /** e.g. "about 6 weeks" */
  time?: string;
  naira?: number;
};

/** The atom of "Eligible if…": what's missing, why, how to close it, time and cost. */
export function GapItem({
  gap,
  onAdd,
  added = false,
}: {
  gap: Gap;
  onAdd?: () => void;
  added?: boolean;
}) {
  return (
    <article className="rounded-r-md border border-line p-4">
      <h3 className="flex items-start gap-2 font-semibold text-ink">
        <CircleDashed aria-hidden className="mt-0.5 size-4 shrink-0 text-info" />
        {gap.what}
      </h3>
      <dl className="mt-2 grid gap-1 text-body-s sm:grid-cols-[auto_1fr] sm:gap-x-3">
        <dt className="font-semibold text-muted">Why it matters</dt>
        <dd className="text-ink">{gap.why}</dd>
        <dt className="font-semibold text-muted">How to close it</dt>
        <dd className="text-ink">{gap.how}</dd>
        {(gap.time || gap.naira !== undefined) && (
          <>
            <dt className="font-semibold text-muted">Time and cost</dt>
            <dd className="tabular-nums text-ink">
              {[gap.time, gap.naira !== undefined ? formatNaira(gap.naira) : null]
                .filter(Boolean)
                .join(" · ")}
            </dd>
          </>
        )}
      </dl>
      {onAdd && (
        <div className="mt-3">
          {added ? (
            <p className="flex items-center gap-1.5 text-body-s font-semibold text-success">
              <Check aria-hidden className="size-4" /> In your plan
            </p>
          ) : (
            <Button
              size="sm"
              variant="secondary"
              icon={<Plus aria-hidden className="size-4" />}
              onClick={onAdd}
            >
              Add to plan
            </Button>
          )}
        </div>
      )}
    </article>
  );
}

export type ProgressStep = { label: string; state: "done" | "active" | "pending" };

/**
 * Streamed steps ("Reading the form ✓ → Matching your profile ✓ → Writing 3
 * answers…"), announced politely. The person can leave and come back.
 */
export function TaskProgress({ steps, title }: { steps: ProgressStep[]; title: string }) {
  const active = steps.find((step) => step.state === "active");
  return (
    <section aria-label={title} className="rounded-r-md border border-line p-4">
      <p className="text-h4 text-ink">{title}</p>
      <ol className="mt-2 space-y-1.5">
        {steps.map((step) => (
          <li key={step.label} className="flex items-center gap-2 text-body">
            {step.state === "done" && <Check aria-hidden className="size-4 text-success" />}
            {step.state === "active" && (
              <Loader2 aria-hidden className="size-4 animate-spin text-accent" />
            )}
            {step.state === "pending" && (
              <span aria-hidden className="size-4 rounded-full border-2 border-line" />
            )}
            <span
              className={cx(
                step.state === "pending" ? "text-muted" : "text-ink",
                step.state === "active" && "font-semibold",
              )}
            >
              {step.label}
              <span className="sr-only">
                {step.state === "done"
                  ? " (done)"
                  : step.state === "active"
                    ? " (in progress)"
                    : ""}
              </span>
            </span>
          </li>
        ))}
      </ol>
      <p aria-live="polite" className="sr-only">
        {active
          ? `${active.label}…`
          : steps.every((step) => step.state === "done")
            ? `${title}: done`
            : ""}
      </p>
      <p className="mt-3 text-caption text-subtle">
        You can leave this page. We&apos;ll keep going and tell you when it&apos;s ready.
      </p>
    </section>
  );
}
