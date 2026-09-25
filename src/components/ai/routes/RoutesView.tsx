"use client";

import { Calculator, Check, Compass, Plus, Scale } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { ApiError } from "@/lib/api";
import { type EligibilityResult, useEligibility } from "@/lib/ai/onboarding";
import { useAllPathways, usePlan } from "@/lib/ai/plan";
import {
  CALCULATORS,
  calculatorFor,
  checkedAt,
  routeCosts,
  topUnlocks,
  type Unlock,
  useAddTodo,
} from "@/lib/ai/routes";
import { useMe } from "@/lib/ai/shell";
import { Button, ButtonLink } from "../Button";
import { RouteCard } from "../evidence/cards";
import { formatDate } from "../evidence/format";
import { EmptyState, InlineAlert, Skeleton } from "../feedback";
import { COUNTRY_NAMES } from "../Flag";
import { useToast } from "../Toast";

/** The line under a route: its first gap, else its first reason. */
export function routeTopLine(result: EligibilityResult): string {
  if (result.gaps[0]) return result.gaps[0].text;
  const reasons = Array.isArray(result.reasons) ? (result.reasons as unknown[]) : [];
  if (typeof reasons[0] === "string") return reasons[0];
  return result.status === "eligible"
    ? "You meet every requirement we check."
    : "See the details for why.";
}

function RouteList({
  results,
  costs,
}: {
  results: EligibilityResult[];
  costs: Record<string, number>;
}) {
  return (
    <ul className="grid gap-3 lg:grid-cols-2">
      {results.map((result) => (
        <li key={result.route.code}>
          <RouteCard
            name={result.route.name}
            status={result.status}
            topLine={routeTopLine(result)}
            months={result.route.typical_months_to_arrival ?? undefined}
            naira={costs[result.route.code]}
            href={`/ai/routes/${result.route.code}`}
          />
          {result.uses_stale_rules && (
            <p className="mt-1 px-1 text-caption text-warning">
              Uses a rule that is awaiting a re-check.
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}

/** The gaps that would open the most routes (web.md §6.1). */
function Unlocks({ unlocks }: { unlocks: Unlock[] }) {
  const plan = usePlan();
  const add = useAddTodo();
  const toast = useToast();
  const [added, setAdded] = useState<Set<string>>(() => new Set());
  const [error, setError] = useState<string | null>(null);
  const keys = new Set((plan.data?.todos ?? []).map((todo) => todo.key));
  // Already a to-do: from the plan itself, from a route page, or from here.
  const inPlan = (unlock: Unlock) =>
    added.has(unlock.key) ||
    keys.has(`added:unlock:${unlock.key}`) ||
    unlock.routes.some(
      (route) =>
        keys.has(`${route.code}:${unlock.key}`) || keys.has(`added:${route.code}:${unlock.key}`),
    );

  function addToPlan(unlock: Unlock) {
    setError(null);
    add.mutate(
      {
        key: `unlock:${unlock.key}`,
        title: unlock.text,
        detail: `Opens ${unlock.routes.map((route) => route.name).join(", ")}.`,
        route: unlock.routes[0].code,
      },
      {
        onSuccess: () => {
          setAdded((current) => new Set(current).add(unlock.key));
          toast({ message: `Added to your plan: ${unlock.text}` });
        },
        onError: (err) =>
          setError(err instanceof ApiError ? err.message : "That didn't save. Try again."),
      },
    );
  }

  return (
    <section
      aria-labelledby="unlocks-heading"
      className="rounded-r-md border border-info-line bg-info-bg p-5"
    >
      <h2 id="unlocks-heading" className="text-h3 text-ink">
        What would change my results?
      </h2>
      <p className="mt-1 text-body-s text-muted">
        The gaps that stand between you and the most routes.
      </p>
      {error && <InlineAlert tone="danger" title={error} className="mt-3" />}
      <ol className="mt-3 space-y-3">
        {unlocks.map((unlock) => (
          <li key={unlock.key} className="rounded-r-md border border-line bg-surface p-4">
            <p className="font-semibold text-ink">{unlock.text}</p>
            <p className="mt-1 text-body-s text-muted">
              Opens {unlock.routes.length} route{unlock.routes.length === 1 ? "" : "s"}:{" "}
              {unlock.routes.map((route, index) => (
                <span key={route.code}>
                  {index > 0 && ", "}
                  <Link
                    href={`/ai/routes/${route.code}`}
                    className="text-accent underline underline-offset-3"
                  >
                    {route.name}
                  </Link>
                </span>
              ))}
            </p>
            <div className="mt-3">
              {inPlan(unlock) ? (
                <p className="flex items-center gap-1.5 text-body-s font-semibold text-success">
                  <Check aria-hidden className="size-4" /> In your plan
                </p>
              ) : (
                <Button
                  size="sm"
                  variant="secondary"
                  icon={<Plus aria-hidden className="size-4" />}
                  loading={add.isPending && add.variables?.key === `unlock:${unlock.key}`}
                  onClick={() => addToPlan(unlock)}
                >
                  Add to plan
                </Button>
              )}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

/** /ai/routes: every route in your destination, blocked first (A2). */
export function RoutesView() {
  const me = useMe();
  const country = me.data?.destination ?? null;
  const eligibility = useEligibility(Boolean(country));
  const pathways = useAllPathways();
  const results = eligibility.data?.results ?? [];
  const blocked = results.filter((result) => result.status === "blocked");
  const open = results.filter((result) => result.status !== "blocked");
  const costs = routeCosts(pathways.data);
  const unlocks = topUnlocks(results);
  const checked = checkedAt(results);
  const calculator = calculatorFor(country);
  const name = country ? (COUNTRY_NAMES[country] ?? country) : "";

  if (me.data && !country) {
    return (
      <EmptyState
        icon={<Compass />}
        title="Choose a destination first"
        action={
          <ButtonLink href="/ai/compare" variant="primary">
            Compare countries
          </ButtonLink>
        }
      >
        Routes are worked out for one country at a time.
      </EmptyState>
    );
  }

  return (
    <>
      <header className="mb-6">
        <p className="text-overline text-muted uppercase">Routes</p>
        <h1 className="mt-1 font-display text-h1 text-ink">
          {name ? `Your routes to ${name}` : "Your routes"}
        </h1>
        {checked && (
          <p className="mt-2 text-body text-muted">
            Checked against the rules as of {formatDate(checked)}, using only the details you
            confirmed.
          </p>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          <ButtonLink href="/ai/compare" size="sm" icon={<Scale aria-hidden className="size-4" />}>
            Compare countries
          </ButtonLink>
          {calculator && (
            <ButtonLink
              href={`/ai/calculators/${calculator}`}
              size="sm"
              icon={<Calculator aria-hidden className="size-4" />}
            >
              {CALCULATORS[calculator].title}
            </ButtonLink>
          )}
        </div>
      </header>

      {eligibility.isPending ? (
        <div
          className="grid gap-3 lg:grid-cols-2"
          aria-busy="true"
          aria-label="Loading your routes"
        >
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : eligibility.isError ? (
        <InlineAlert
          tone="danger"
          title="We couldn't load your routes."
          action={
            <Button size="sm" variant="secondary" onClick={() => void eligibility.refetch()}>
              Try again
            </Button>
          }
        />
      ) : results.length === 0 ? (
        <EmptyState icon={<Compass />} title={`No routes for ${name} yet`}>
          Our researchers haven&apos;t published this country&apos;s routes yet.
        </EmptyState>
      ) : (
        <div className="space-y-8">
          {blocked.length > 0 && (
            <section aria-labelledby="blocked-heading">
              <h2 id="blocked-heading" className="mb-3 font-display text-h2 text-ink">
                Blocked for your nationality
              </h2>
              <RouteList results={blocked} costs={costs} />
            </section>
          )}
          {open.length > 0 && (
            <section aria-labelledby="open-heading">
              <h2 id="open-heading" className="mb-3 font-display text-h2 text-ink">
                {blocked.length ? "Other routes" : "Every route we check"}
              </h2>
              <RouteList results={open} costs={costs} />
            </section>
          )}
          {unlocks.length > 0 && <Unlocks unlocks={unlocks} />}
        </div>
      )}
    </>
  );
}
