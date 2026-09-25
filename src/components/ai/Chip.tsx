/**
 * Chips and pills (design-system §8.1).
 *
 * A Pill labels (never interactive); a Chip filters or selects. Status pills
 * carry an icon and a word, never colour alone.
 */

import { Check, X } from "lucide-react";
import { cx } from "./cx";

export type Tone = "neutral" | "success" | "info" | "warning" | "danger" | "accent";

const PILL: Record<Tone, string> = {
  neutral: "border-line bg-sunken text-muted",
  success: "border-success-line bg-success-bg text-success",
  info: "border-info-line bg-info-bg text-info",
  warning: "border-warning-line bg-warning-bg text-warning",
  danger: "border-danger-line bg-danger-bg text-danger",
  accent: "border-transparent bg-accent-soft text-accent",
};

export function Pill({
  tone = "neutral",
  icon,
  children,
  solid,
  className,
}: {
  tone?: Tone;
  icon?: React.ReactNode;
  children: React.ReactNode;
  /** The strongest form (e.g. "Blocked for your nationality"): filled with the tone. */
  solid?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cx(
        "inline-flex h-6 shrink-0 items-center gap-1 rounded-full border px-2.5 text-caption font-semibold whitespace-nowrap",
        solid && tone === "danger" ? "border-danger bg-danger text-on-danger" : PILL[tone],
        className,
      )}
    >
      {icon}
      {children}
    </span>
  );
}

/** A count badge, e.g. unread notifications. */
export function CountBadge({ count, label }: { count: number; label: string }) {
  if (count <= 0) return null;
  return (
    <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1.5 text-caption font-semibold tabular-nums text-on-danger">
      <span aria-hidden>{count > 99 ? "99+" : count}</span>
      <span className="sr-only">
        {count} {label}
      </span>
    </span>
  );
}

export function Chip({
  selected = false,
  onClick,
  onRemove,
  children,
  className,
}: {
  selected?: boolean;
  onClick?: () => void;
  /** Adds a remove button (for applied filters). */
  onRemove?: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  const body = cx(
    "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border text-body-s font-semibold transition-colors duration-m-fast ease-m",
    selected
      ? "border-transparent bg-accent-soft text-accent"
      : "border-field-line bg-surface text-ink hover:bg-sunken",
    onRemove ? "pl-3" : "px-3",
    className,
  );
  const content = (
    <>
      {selected && !onRemove && <Check aria-hidden className="size-4" />}
      {children}
    </>
  );
  if (onRemove) {
    return (
      <span className={body}>
        {content}
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${typeof children === "string" ? children : "filter"}`}
          className="flex size-9 items-center justify-center rounded-full hover:bg-sunken"
        >
          <X aria-hidden className="size-4" />
        </button>
      </span>
    );
  }
  return (
    <button type="button" aria-pressed={selected} onClick={onClick} className={body}>
      {content}
    </button>
  );
}
