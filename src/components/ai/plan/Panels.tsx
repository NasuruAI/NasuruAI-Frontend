"use client";

import { ClockAlert, FileWarning } from "lucide-react";
import Link from "next/link";
import { useRuleChanges } from "@/lib/ai/shell";
import { upcomingDeadlines, useBoard, useExpiring } from "@/lib/ai/plan";
import { cx } from "../cx";
import { formatDate } from "../evidence/format";
import { CountdownChip, StatusPill, type StatusKind } from "../evidence/Status";
import { Skeleton } from "../feedback";

const STATUSES = new Set(["eligible", "eligible_if", "not_eligible", "blocked"]);

function Panel({
  title,
  id,
  children,
  more,
}: {
  title: string;
  id: string;
  children: React.ReactNode;
  more?: React.ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="rounded-r-md border border-line bg-surface p-5">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 id={id} className="text-h3 text-ink">
          {title}
        </h2>
        {more}
      </div>
      {children}
    </section>
  );
}

/** Tracked applications whose deadline is still ahead (web.md §5). */
export function DeadlinesPanel() {
  const board = useBoard();
  const deadlines = board.data ? upcomingDeadlines(board.data.columns) : [];
  return (
    <Panel
      title="Deadlines"
      id="deadlines-heading"
      more={
        <Link
          href="/ai/deadlines"
          className="text-body-s font-semibold text-accent hover:underline"
        >
          All deadlines
        </Link>
      }
    >
      {board.isPending ? (
        <Skeleton className="h-20 w-full" />
      ) : board.isError ? (
        <p className="text-body-s text-danger">We couldn&apos;t load your deadlines.</p>
      ) : deadlines.length ? (
        <ul className="divide-y divide-line">
          {deadlines.map((card) => (
            <li key={card.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
              <div className="min-w-0">
                <Link
                  href={`/ai/track/${card.id}`}
                  className="font-semibold text-ink hover:underline hover:underline-offset-3"
                >
                  {card.organisation}
                </Link>
                <p className="text-body-s text-muted">{card.title}</p>
              </div>
              <CountdownChip date={card.deadline} label="Closes" />
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-body-s text-muted">
          No deadlines yet. Save a programme or a job and its deadline shows here.{" "}
          <Link href="/ai/study" className="font-semibold text-accent underline underline-offset-3">
            Find programmes
          </Link>
        </p>
      )}
    </Panel>
  );
}

/** Documents running out and rule changes that moved a result. */
export function AlertsPanel() {
  const expiring = useExpiring();
  const changes = useRuleChanges();
  const warnings = expiring.data ?? [];
  const recent = (changes.data ?? []).slice(0, 3);
  const loading = expiring.isPending || changes.isPending;

  return (
    <Panel
      title="Alerts"
      id="alerts-heading"
      more={
        recent.length > 0 && (
          <Link
            href="/ai/changes/mine"
            className="text-body-s font-semibold text-accent hover:underline"
          >
            All changes
          </Link>
        )
      }
    >
      {loading ? (
        <Skeleton className="h-20 w-full" />
      ) : warnings.length === 0 && recent.length === 0 ? (
        <p className="text-body-s text-muted">Nothing needs your attention.</p>
      ) : (
        <ul className="space-y-3">
          {warnings.map((warning) => (
            <li key={warning.document_id} className="flex items-start gap-2">
              <FileWarning
                aria-hidden
                className={cx(
                  "mt-0.5 size-4 shrink-0",
                  warning.expired ? "text-danger" : "text-warning",
                )}
              />
              <span className="text-body-s text-ink">
                {warning.message}{" "}
                <Link
                  href="/ai/documents"
                  className="font-semibold text-accent underline underline-offset-3"
                >
                  Documents
                </Link>
              </span>
            </li>
          ))}
          {recent.map((change) => (
            <li key={change.id} className="flex items-start gap-2">
              <ClockAlert aria-hidden className="mt-0.5 size-4 shrink-0 text-info" />
              <span className="min-w-0 text-body-s text-ink">
                <Link
                  href={`/ai/routes/${change.route.code}`}
                  className="font-semibold hover:underline hover:underline-offset-3"
                >
                  {change.route.name}
                </Link>{" "}
                {change.cause === "rules" ? "changed its rules" : "changed with your profile"} on{" "}
                {formatDate(change.created_at)}
                {STATUSES.has(change.to_status) && (
                  <span className="mt-1 flex flex-wrap items-center gap-1">
                    now <StatusPill status={change.to_status as StatusKind} />
                  </span>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
