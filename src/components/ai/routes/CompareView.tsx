"use client";

import { ArrowDown, ArrowUp, ArrowUpDown, Check, Flag as FlagIcon } from "lucide-react";
import { useState } from "react";
import { ApiError } from "@/lib/api";
import { type CompareRow, useCompare } from "@/lib/ai/onboarding";
import { useEligibilityFor } from "@/lib/ai/routes";
import { useChooseDestination, useDestination, useRuleChanges } from "@/lib/ai/shell";
import { Button } from "../Button";
import { cx } from "../cx";
import { ConfirmDialog, Sheet } from "../Dialog";
import { RouteCard } from "../evidence/cards";
import { formatDate } from "../evidence/format";
import { StatusPill, type StatusKind } from "../evidence/Status";
import { InlineAlert, Skeleton } from "../feedback";
import { Flag } from "../Flag";
import { useToast } from "../Toast";
import { routeTopLine } from "./RoutesView";

const STATUS_RANK: Record<string, number> = {
  eligible: 0,
  eligible_if: 1,
  not_eligible: 2,
  blocked: 3,
};

type SortKey = "country" | "status" | "months" | "open" | "change";
type Sort = { key: SortKey; direction: "ascending" | "descending" };

export type CompareLine = {
  row: CompareRow;
  open: number;
  lastChange: string | null;
};

/** Routes you're eligible for or could be: eligible plus eligible-if. */
export function openCount(row: CompareRow): number {
  return (row.counts.eligible ?? 0) + (row.counts.eligible_if ?? 0);
}

export function sortLines(lines: CompareLine[], sort: Sort): CompareLine[] {
  const value = (line: CompareLine): number | string => {
    switch (sort.key) {
      case "country":
        return line.row.name;
      case "status":
        return STATUS_RANK[line.row.best_status ?? ""] ?? 9;
      case "months":
        return line.row.best_route?.typical_months_to_arrival ?? Number.MAX_SAFE_INTEGER;
      case "open":
        return -openCount(line.row);
      case "change":
        return line.lastChange ? -new Date(line.lastChange).getTime() : Number.MAX_SAFE_INTEGER;
    }
  };
  const sorted = [...lines].sort((a, b) => {
    const x = value(a);
    const y = value(b);
    return typeof x === "string" && typeof y === "string"
      ? x.localeCompare(y)
      : Number(x) - Number(y);
  });
  return sort.direction === "ascending" ? sorted : sorted.reverse();
}

function SortHeader({
  label,
  column,
  sort,
  onSort,
}: {
  label: string;
  column: SortKey;
  sort: Sort;
  onSort: (key: SortKey) => void;
}) {
  const active = sort.key === column;
  const Icon = !active ? ArrowUpDown : sort.direction === "ascending" ? ArrowUp : ArrowDown;
  return (
    <th scope="col" aria-sort={active ? sort.direction : "none"} className="px-3 py-2">
      <button
        type="button"
        onClick={() => onSort(column)}
        className="inline-flex items-center gap-1 font-semibold text-muted hover:text-ink"
      >
        {label}
        <Icon aria-hidden className="size-3.5" />
      </button>
    </th>
  );
}

function CountrySheet({
  row,
  active,
  onClose,
}: {
  row: CompareRow;
  active: boolean;
  onClose: () => void;
}) {
  const eligibility = useEligibilityFor(row.country);
  const choose = useChooseDestination();
  const destination = useDestination();
  const toast = useToast();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const results = eligibility.data?.results ?? [];
  const graceDay = destination.data?.in_first_choice_grace;

  function switchTo() {
    setError(null);
    choose.mutate(row.country, {
      onSuccess: () => {
        setConfirming(false);
        toast({ message: `Your destination is now ${row.name}.` });
        onClose();
      },
      onError: (err) => {
        setConfirming(false);
        setError(err instanceof ApiError ? err.message : "That didn't save. Try again.");
      },
    });
  }

  return (
    <>
      <Sheet
        open
        onClose={onClose}
        title={row.name}
        description="Your result for every route we check here. Looking never counts as a switch."
        footer={
          active ? (
            <p className="flex items-center gap-1.5 text-body-s font-semibold text-success">
              <Check aria-hidden className="size-4" /> Your destination
            </p>
          ) : (
            <Button onClick={() => setConfirming(true)}>Switch to {row.name}</Button>
          )
        }
      >
        {error && <InlineAlert tone="danger" title={error} className="mb-3" />}
        {eligibility.isPending ? (
          <Skeleton className="h-40 w-full" />
        ) : eligibility.isError ? (
          <InlineAlert tone="danger" title="We couldn't load this country's routes." />
        ) : results.length === 0 ? (
          <p className="text-body text-muted">
            Our researchers haven&apos;t published these routes yet.
          </p>
        ) : (
          <ul className="space-y-3">
            {results.map((result) => (
              <li key={result.route.code}>
                <RouteCard
                  name={result.route.name}
                  status={result.status}
                  topLine={routeTopLine(result)}
                  months={result.route.typical_months_to_arrival ?? undefined}
                  href={`/ai/routes/${result.route.code}`}
                />
              </li>
            ))}
          </ul>
        )}
      </Sheet>
      <ConfirmDialog
        open={confirming}
        onClose={() => setConfirming(false)}
        onConfirm={switchTo}
        loading={choose.isPending}
        title={`Switch to ${row.name}?`}
        confirmLabel={`Switch to ${row.name}`}
      >
        <p className="text-body text-ink">
          Your current plan is archived, read-only, and everything you see becomes about {row.name}.
        </p>
        <p className="mt-2 text-body text-muted">
          {graceDay
            ? "You chose your first destination less than 24 hours ago, so this switch is free."
            : "After this, you can switch again in 30 days."}
        </p>
      </ConfirmDialog>
    </>
  );
}

/** /ai/compare: the seven countries side by side (web.md §6.3). */
export function CompareView() {
  const compare = useCompare();
  const destination = useDestination();
  const changes = useRuleChanges();
  const [sort, setSort] = useState<Sort>({ key: "status", direction: "ascending" });
  const [open, setOpen] = useState<CompareRow | null>(null);
  const active = destination.data?.active?.country ?? null;

  const lastChange: Record<string, string> = {};
  for (const change of changes.data ?? []) {
    const country = change.route.country;
    if (!lastChange[country] || change.created_at > lastChange[country]) {
      lastChange[country] = change.created_at;
    }
  }
  const lines = sortLines(
    (compare.data ?? []).map((row) => ({
      row,
      open: openCount(row),
      lastChange: lastChange[row.country] ?? null,
    })),
    sort,
  );

  function onSort(key: SortKey) {
    setSort((current) =>
      current.key === key
        ? { key, direction: current.direction === "ascending" ? "descending" : "ascending" }
        : { key, direction: "ascending" },
    );
  }

  return (
    <>
      <h1 className="font-display text-h1 text-ink">Compare countries</h1>
      <p className="mt-2 mb-6 text-body-l text-muted">
        Your best route in each of the seven countries. Comparing is free and never switches your
        destination.
      </p>
      {compare.isPending ? (
        <Skeleton className="h-72 w-full" />
      ) : compare.isError ? (
        <InlineAlert
          tone="danger"
          title="We couldn't load the comparison. Reload the page to try again."
        />
      ) : (
        <div className="relative overflow-x-auto rounded-r-md border border-line bg-surface">
          <table className="w-full min-w-[46rem] text-left text-body-s">
            <caption className="sr-only">
              The seven countries, sortable. Choose a country to see its routes.
            </caption>
            <thead className="bg-sunken">
              <tr>
                <SortHeader label="Country" column="country" sort={sort} onSort={onSort} />
                <th scope="col" className="px-3 py-2 font-semibold text-muted">
                  Best route
                </th>
                <SortHeader label="Result" column="status" sort={sort} onSort={onSort} />
                <SortHeader label="Time" column="months" sort={sort} onSort={onSort} />
                <th scope="col" className="px-3 py-2 font-semibold text-muted">
                  Residence
                </th>
                <SortHeader label="Routes open" column="open" sort={sort} onSort={onSort} />
                <SortHeader label="Last change" column="change" sort={sort} onSort={onSort} />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {lines.map(({ row, open: count, lastChange: changed }) => (
                <tr
                  key={row.country}
                  className={cx(
                    "cursor-pointer align-top hover:bg-sunken",
                    row.country === active && "bg-accent-soft",
                  )}
                  onClick={() => setOpen(row)}
                >
                  <th scope="row" className="px-3 py-3 font-normal">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        setOpen(row);
                      }}
                      className="inline-flex items-center gap-2 font-semibold text-ink hover:underline"
                    >
                      <Flag country={row.country} />
                      {row.name}
                      {row.country === active && (
                        <span className="sr-only"> (your destination)</span>
                      )}
                    </button>
                  </th>
                  <td className="px-3 py-3 text-ink">{row.best_route?.name ?? "—"}</td>
                  <td className="px-3 py-3">
                    {row.best_status && STATUS_RANK[row.best_status] !== undefined ? (
                      <StatusPill status={row.best_status as StatusKind} />
                    ) : (
                      <span className="text-muted">Not checked yet</span>
                    )}
                  </td>
                  <td className="px-3 py-3 tabular-nums text-ink">
                    {row.best_route?.typical_months_to_arrival
                      ? `${row.best_route.typical_months_to_arrival} months`
                      : "—"}
                  </td>
                  <td className="px-3 py-3 text-ink">
                    {row.best_route?.leads_to_pr ? (
                      <span className="inline-flex items-center gap-1">
                        <FlagIcon aria-hidden className="size-3.5 text-accent" /> Yes
                      </span>
                    ) : row.best_route ? (
                      "No"
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-3 py-3 tabular-nums text-ink">{count}</td>
                  <td className="px-3 py-3 text-muted">{changed ? formatDate(changed) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {open && (
        <CountrySheet row={open} active={open.country === active} onClose={() => setOpen(null)} />
      )}
    </>
  );
}
