/**
 * Provenance components (design-system §8.2): SourceLine (and its stale
 * form), DiffView and PartnerLabel.
 *
 * A rule-derived figure without its SourceLine is an incomplete component.
 */

import { ClockAlert, Handshake, Link2 } from "lucide-react";
import { cx } from "../cx";
import { formatDate } from "./format";

export type Source = {
  name: string;
  url?: string;
  /** When a person last confirmed the figure against the source. */
  checkedOn?: string;
  /** Past this date the figure is awaiting re-check. */
  recheckAfter?: string | null;
  /** Set by the API when it already knows (e.g. `is_stale`). */
  stale?: boolean;
};

export function isStale(source: Source, now: Date = new Date()): boolean {
  if (source.stale) return true;
  return Boolean(source.recheckAfter && new Date(source.recheckAfter) < now);
}

export function SourceLine({ source, className }: { source: Source; className?: string }) {
  const stale = isStale(source);
  const name = source.url ? (
    <a
      href={source.url}
      target="_blank"
      rel="noopener noreferrer"
      className="underline underline-offset-3 hover:text-ink"
    >
      {source.name}
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  ) : (
    source.name
  );
  if (stale) {
    return (
      <p className={cx("flex items-center gap-1.5 text-caption text-warning", className)}>
        <ClockAlert aria-hidden className="size-3.5 shrink-0" />
        <span>
          {name} · awaiting re-check
          {source.recheckAfter && ` since ${formatDate(source.recheckAfter)}`}
        </span>
      </p>
    );
  }
  return (
    <p className={cx("flex items-center gap-1.5 text-caption text-subtle", className)}>
      <Link2 aria-hidden className="size-3.5 shrink-0" />
      <span>
        {name}
        {source.checkedOn && ` · checked ${formatDate(source.checkedOn)}`}
      </span>
    </p>
  );
}

/** Old value struck through, new value on highlight: rule changes, fact edits, moved deadlines. */
export function DiffView({
  before,
  after,
  label,
}: {
  before: React.ReactNode;
  after: React.ReactNode;
  label?: string;
}) {
  return (
    <p className="text-body">
      {label && <span className="mr-2 text-body-s font-semibold text-muted">{label}</span>}
      <del className="text-subtle line-through decoration-1">
        <span className="sr-only">Was: </span>
        {before}
      </del>{" "}
      <ins className="rounded-r-sm border border-highlight-line bg-highlight px-1 text-ink no-underline">
        <span className="sr-only">Now: </span>
        {after}
      </ins>
    </p>
  );
}

/** Mandatory on anything that can earn a commission. */
export function PartnerLabel({ href = "/ai/how-ranking-works" }: { href?: string }) {
  return (
    <p className="flex items-start gap-1.5 rounded-r-sm bg-sunken px-2 py-1.5 text-caption text-muted">
      <Handshake aria-hidden className="mt-0.5 size-3.5 shrink-0" />
      <span>
        Partner: we may earn a commission. It does not change the ranking.{" "}
        <a href={href} className="underline underline-offset-3">
          How ranking works
        </a>
      </span>
    </p>
  );
}
