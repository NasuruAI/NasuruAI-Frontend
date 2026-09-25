"use client";

import { Compass, Share2, Shuffle } from "lucide-react";
import { useState } from "react";
import { resumeStep, stepHref, useOccupation } from "@/lib/ai/onboarding";
import { arrivalMonth, usePlan } from "@/lib/ai/plan";
import { useMe } from "@/lib/ai/shell";
import { Button, ButtonLink } from "../Button";
import { formatNaira } from "../evidence/format";
import { Timeline, type TimelineStep } from "../evidence/Progress";
import { EmptyState, InlineAlert, Skeleton } from "../feedback";
import { AlertsPanel, DeadlinesPanel } from "./Panels";
import { ShareDialog } from "./ShareDialog";
import { TodoList } from "./TodoList";

/** "Continue where you left off" while onboarding isn't finished (web.md §4). */
function ContinueOnboarding() {
  const me = useMe();
  const occupation = useOccupation();
  if (!me.data || me.data.onboarding_completed_at || occupation.isPending) return null;
  const step = resumeStep(me.data, Boolean(occupation.data));
  if (step === "done") return null;
  return (
    <InlineAlert
      tone="info"
      title="Continue where you left off"
      className="mb-6"
      action={
        <ButtonLink href={stepHref(step)} variant="primary" size="sm">
          Continue
        </ButtonLink>
      }
    >
      A few more minutes and your results and plan are ready.
    </InlineAlert>
  );
}

export function PlanView() {
  const me = useMe();
  const plan = usePlan();
  const [sharing, setSharing] = useState(false);

  if (plan.isPending) {
    return (
      <div aria-busy="true" aria-label="Loading your plan" className="space-y-4">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (plan.isError) {
    return (
      <InlineAlert
        tone="danger"
        title="We couldn't load your plan."
        action={
          <Button size="sm" variant="secondary" onClick={() => void plan.refetch()}>
            Try again
          </Button>
        }
      >
        Check your connection. Nothing you saved is lost.
      </InlineAlert>
    );
  }

  const { plan: chosen, todos, share } = plan.data;
  const pathway = chosen?.pathway ?? null;

  if (!chosen) {
    const finished = Boolean(me.data?.onboarding_completed_at);
    return (
      <>
        <ContinueOnboarding />
        <EmptyState
          icon={<Compass />}
          title="You haven't chosen a pathway yet"
          action={
            finished ? (
              <ButtonLink href="/ai/plan/pathways" variant="primary">
                Choose a pathway
              </ButtonLink>
            ) : undefined
          }
        >
          {finished
            ? "Pick one of your pathways and we'll turn it into steps with dates."
            : "Finish getting started and we'll suggest the pathways open to you."}
        </EmptyState>
      </>
    );
  }

  const steps: TimelineStep[] = (pathway?.steps ?? []).map((step, index) => ({
    title: step.name,
    when: step.months ? `about ${step.months} months` : undefined,
    status: index === 0 ? "current" : "future",
    leadsToPr: step.leads_to_pr,
  }));
  const spend = Number(pathway?.cost.spend_ngn ?? 0);
  const summary = [
    spend > 0 ? `≈ ${formatNaira(spend, { short: true })}` : "cost not priced yet",
    pathway?.months_to_arrival ? `arrive around ${arrivalMonth(pathway.months_to_arrival)}` : null,
    pathway?.leads_to_pr ? "leads to permanent residence" : null,
  ].filter(Boolean);

  return (
    <>
      <ContinueOnboarding />
      <header className="mb-6">
        <p className="text-overline text-muted uppercase">Your plan</p>
        <h1 className="mt-1 font-display text-h1 text-balance text-ink">
          {pathway?.title ?? chosen.codes.join(" → ")}
        </h1>
        {pathway && <p className="mt-2 text-body-l text-muted">{summary.join(" · ")}</p>}
        <div className="mt-4 flex flex-wrap gap-2">
          <ButtonLink
            href="/ai/plan/pathways"
            size="sm"
            icon={<Shuffle aria-hidden className="size-4" />}
          >
            Switch plan
          </ButtonLink>
          <Button
            size="sm"
            variant="secondary"
            icon={<Share2 aria-hidden className="size-4" />}
            onClick={() => setSharing(true)}
          >
            Share with family
          </Button>
        </div>
      </header>

      {chosen.needs_replanning && (
        <InlineAlert
          tone="warning"
          title="This plan no longer works as it is"
          className="mb-6"
          action={
            <ButtonLink href="/ai/plan/pathways" size="sm" variant="primary">
              Choose again
            </ButtonLink>
          }
        >
          A rule or your profile changed, so these routes no longer line up. Your to-dos are kept.
        </InlineAlert>
      )}

      {steps.length > 0 && (
        <section
          aria-label="Pathway"
          className="mb-8 rounded-r-md border border-line bg-surface p-5"
        >
          <div className="hidden lg:block">
            <Timeline steps={steps} orientation="horizontal" />
          </div>
          <div className="lg:hidden">
            <Timeline steps={steps} />
          </div>
        </section>
      )}

      <section aria-labelledby="todos-heading" className="mb-8">
        <h2 id="todos-heading" className="mb-2 font-display text-h2 text-ink">
          Your next steps
        </h2>
        <TodoList todos={todos} />
      </section>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <DeadlinesPanel />
        <AlertsPanel />
      </div>

      {sharing && (
        <ShareDialog
          open
          onClose={() => setSharing(false)}
          share={share}
          name={me.data?.first_name || "My"}
        />
      )}
    </>
  );
}
