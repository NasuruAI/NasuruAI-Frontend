/**
 * Feedback and status surfaces (design-system §8.1): InlineAlert, Banner,
 * Skeleton, EmptyState, ProgressBar and Stepper.
 */

import { CircleAlert, CircleCheck, Info, TriangleAlert, X } from "lucide-react";
import { cx } from "./cx";

type AlertTone = "info" | "success" | "warning" | "danger";

const ALERT: Record<AlertTone, { box: string; Icon: typeof Info }> = {
  info: { box: "border-info-line bg-info-bg text-info", Icon: Info },
  success: { box: "border-success-line bg-success-bg text-success", Icon: CircleCheck },
  warning: { box: "border-warning-line bg-warning-bg text-warning", Icon: TriangleAlert },
  danger: { box: "border-danger-line bg-danger-bg text-danger", Icon: CircleAlert },
};

/** Icon, title, body and an optional action. `danger` is announced assertively. */
export function InlineAlert({
  tone = "info",
  title,
  children,
  action,
  onDismiss,
  code,
  className,
}: {
  tone?: AlertTone;
  title: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
  onDismiss?: () => void;
  /** An error code support can search for; shown copyable (web.md §14). */
  code?: string;
  className?: string;
}) {
  const { box, Icon } = ALERT[tone];
  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      className={cx("flex gap-3 rounded-r-md border p-4", box, className)}
    >
      <Icon aria-hidden className="mt-0.5 size-5 shrink-0" />
      <div className="min-w-0 flex-1 text-ink">
        <p className="font-semibold">{title}</p>
        {children && <div className="mt-1 text-body-s text-muted">{children}</div>}
        {code && (
          <p className="mt-2 text-caption text-muted">
            Reference:{" "}
            <code className="rounded-r-sm bg-surface px-1 font-mono select-all">{code}</code>
          </p>
        )}
        {action && <div className="mt-3">{action}</div>}
      </div>
      {onDismiss && (
        <button
          type="button"
          aria-label="Dismiss"
          onClick={onDismiss}
          className="-mt-1 -mr-1 flex size-9 shrink-0 items-center justify-center rounded-r-sm text-muted hover:bg-surface"
        >
          <X aria-hidden className="size-4" />
        </button>
      )}
    </div>
  );
}

/** Full width, under the top bar (web.md §1.3). */
export function Banner({
  tone = "info",
  children,
  action,
  onDismiss,
}: {
  tone?: AlertTone;
  children: React.ReactNode;
  action?: React.ReactNode;
  onDismiss?: () => void;
}) {
  const { box, Icon } = ALERT[tone];
  return (
    <div role={tone === "danger" ? "alert" : "status"} className={cx("border-b", box)}>
      <div className="mx-auto flex max-w-[1200px] items-center gap-3 px-4 py-2 md:px-8">
        <Icon aria-hidden className="size-5 shrink-0" />
        <p className="min-w-0 flex-1 text-body-s font-semibold text-ink">{children}</p>
        {action}
        {onDismiss && (
          <button
            type="button"
            aria-label="Dismiss"
            onClick={onDismiss}
            className="flex size-9 items-center justify-center rounded-r-sm hover:bg-surface"
          >
            <X aria-hidden className="size-4" />
          </button>
        )}
      </div>
    </div>
  );
}

/** Shaped like what it stands in for, so nothing jumps when data arrives. */
export function Skeleton({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cx(
        "block animate-pulse rounded-r-sm bg-sunken motion-reduce:animate-none",
        className,
      )}
    />
  );
}

export function SkeletonText({ lines = 3 }: { lines?: number }) {
  return (
    <span aria-hidden className="block space-y-2">
      {Array.from({ length: lines }, (_, index) => (
        <Skeleton key={index} className={cx("h-4", index === lines - 1 ? "w-2/3" : "w-full")} />
      ))}
    </span>
  );
}

/** Never blank: an icon, a title, one sentence, one action. */
export function EmptyState({
  icon,
  title,
  children,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center px-4 py-12 text-center">
      <span
        aria-hidden
        className="flex size-16 items-center justify-center rounded-full bg-sunken text-muted [&>svg]:size-8"
      >
        {icon}
      </span>
      <h2 className="mt-4 font-display text-h3">{title}</h2>
      <p className="mt-1 max-w-[46ch] text-body text-muted">{children}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ProgressBar({
  value,
  max = 100,
  label,
}: {
  value: number;
  max?: number;
  label: string;
}) {
  const percent = Math.max(0, Math.min(100, Math.round((value / max) * 100)));
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between text-body-s text-muted">
        <span>{label}</span>
        <span className="text-metric-s tabular-nums text-ink">{percent}%</span>
      </div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={value}
        className="h-2 overflow-hidden rounded-full bg-sunken"
      >
        <div
          className={cx(
            "h-full rounded-full transition-[width] duration-m-base ease-m",
            percent >= 100 ? "bg-success" : "bg-accent",
          )}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

/**
 * Onboarding's segmented progress: "Step 3 of 7 · about 6 minutes left".
 * `steps` labels are read by screen readers even where only segments show.
 */
export function Stepper({
  steps,
  current,
  minutesLeft,
}: {
  steps: string[];
  /** Zero-based index of the current step. */
  current: number;
  minutesLeft?: number;
}) {
  return (
    <nav aria-label="Progress">
      <p className="mb-2 text-body-s text-muted">
        <span className="font-semibold text-ink">
          Step {current + 1} of {steps.length}
        </span>
        {minutesLeft !== undefined &&
          ` · about ${minutesLeft} minute${minutesLeft === 1 ? "" : "s"} left`}
      </p>
      <ol className="flex gap-1">
        {steps.map((step, index) => {
          const state = index < current ? "done" : index === current ? "current" : "todo";
          return (
            <li
              key={step}
              className="flex-1"
              aria-current={state === "current" ? "step" : undefined}
            >
              <span
                className={cx(
                  "block h-1.5 rounded-full",
                  state === "todo" ? "bg-line" : "bg-accent",
                )}
              />
              <span className="sr-only">
                {step}
                {state === "done" ? " (done)" : state === "current" ? " (current)" : ""}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
