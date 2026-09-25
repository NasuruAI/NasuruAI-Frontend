"use client";

import { Compass, ClockAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ApiError } from "@/lib/api";
import {
  type EligibilityResult,
  type Pathway,
  stepHref,
  useEligibility,
  useFinishOnboarding,
  usePathways,
} from "@/lib/ai/onboarding";
import { useMe } from "@/lib/ai/shell";
import { Button } from "../Button";
import { PathwayCard, RouteCard } from "../evidence/cards";
import type { TimelineStep } from "../evidence/Progress";
import { EmptyState, InlineAlert, Skeleton } from "../feedback";
import { COUNTRY_NAMES } from "../Flag";
import { StepActions } from "./OnboardingFrame";

/** The line under a route's name: the first gap, else the first reason. */
function topLine(result: EligibilityResult): string {
  if (result.gaps[0]) return result.gaps[0].text;
  const reasons = Array.isArray(result.reasons) ? (result.reasons as unknown[]) : [];
  const first = reasons[0];
  if (typeof first === "string") return first;
  if (first && typeof first === "object" && "text" in first) return String(first.text);
  return result.status === "eligible"
    ? "You meet every requirement we check."
    : "See the details for why.";
}

function pathwaySteps(pathway: Pathway): TimelineStep[] {
  return pathway.steps.map((step, index) => ({
    title: step.name,
    when: step.months ? `about ${step.months} months` : undefined,
    status: index === 0 ? "current" : "future",
    leadsToPr: step.leads_to_pr,
  }));
}

export function ResultsStep() {
  const router = useRouter();
  const me = useMe();
  const country = me.data?.destination ?? null;
  const eligibility = useEligibility(Boolean(country));
  const pathways = usePathways(Boolean(country));
  const finish = useFinishOnboarding();
  const [error, setError] = useState<string | null>(null);

  const results = eligibility.data?.results ?? [];
  const top = pathways.data?.[0] ?? null;
  const name = country ? (COUNTRY_NAMES[country] ?? country) : "";
  const spend = Number(top?.cost.spend_ngn ?? 0);
  const stale = results.some((result) => result.uses_stale_rules);

  function build() {
    setError(null);
    finish.mutate(top?.codes ?? null, {
      onSuccess: () => router.push("/ai/plan"),
      onError: (err) =>
        setError(err instanceof ApiError ? err.message : "That didn't save. Try again."),
    });
  }

  if (me.data && !country) {
    return (
      <EmptyState
        icon={<Compass />}
        title="Choose a destination first"
        action={
          <Button onClick={() => router.push(stepHref("destination"))}>Choose a destination</Button>
        }
      >
        Your results are worked out for one country at a time.
      </EmptyState>
    );
  }

  return (
    <>
      <div className="mb-8">
        <p className="text-overline text-muted uppercase">Your results</p>
        <h1 className="mt-1 font-display text-display-l text-balance text-ink">
          {name ? `Here's where you stand in ${name}` : "Here's where you stand"}
        </h1>
        <p className="mt-3 text-body-l text-muted">
          Every route we check, worked out from the details you confirmed and the official rules.
        </p>
      </div>

      {stale && (
        <InlineAlert tone="warning" title="Some rules are awaiting a re-check" className="mb-4">
          A source changed and our researchers are checking it. Results that use it are marked on
          the route page.
        </InlineAlert>
      )}

      {eligibility.isPending ? (
        <div className="space-y-3" aria-busy="true" aria-label="Working out your results">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : eligibility.isError ? (
        <InlineAlert
          tone="danger"
          title="We couldn't load your results. Reload the page to try again."
        />
      ) : results.length === 0 ? (
        <EmptyState icon={<ClockAlert />} title={`No routes for ${name} yet`}>
          Our researchers haven&apos;t published the routes for this country yet. Your plan will
          fill in as soon as they do.
        </EmptyState>
      ) : (
        <>
          <h2 className="sr-only">Routes</h2>
          <ul className="space-y-3">
            {results.map((result, index) => (
              <li
                key={result.route.code}
                className="animate-[m-reveal_480ms_cubic-bezier(0.2,0,0,1)_both]"
                style={{ animationDelay: `${index * 60}ms` }}
              >
                <RouteCard
                  name={result.route.name}
                  status={result.status}
                  topLine={topLine(result)}
                  months={result.route.typical_months_to_arrival ?? undefined}
                  href={`/ai/routes/${result.route.code}`}
                />
              </li>
            ))}
          </ul>
        </>
      )}

      {top && (
        <section aria-labelledby="pathway-heading" className="mt-10">
          <h2 id="pathway-heading" className="mb-3 font-display text-h2 text-ink">
            Your best pathway
          </h2>
          <PathwayCard
            rank={1}
            title={top.title}
            steps={pathwaySteps(top)}
            naira={spend > 0 || top.cost.complete ? spend : null}
            months={top.months_to_arrival ?? 0}
            leadsToPr={top.leads_to_pr}
            probability={top.band}
          />
          {top.cost.complete === false && spend > 0 && (
            <p className="mt-2 text-body-s text-muted">
              Some costs on this pathway aren&apos;t priced yet, so the total is a floor.
            </p>
          )}
        </section>
      )}

      {error && <InlineAlert tone="danger" title={error} className="mt-6" />}
      <StepActions back={stepHref("destination")}>
        <Button size="lg" onClick={build} loading={finish.isPending}>
          Build my plan
        </Button>
      </StepActions>
    </>
  );
}
