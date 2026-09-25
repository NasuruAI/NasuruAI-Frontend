"use client";

import { ArrowLeft, Compass } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ApiError } from "@/lib/api";
import type { Pathway } from "@/lib/ai/onboarding";
import { costLines, useAllPathways, useChoosePlan, usePlan } from "@/lib/ai/plan";
import { PathwayCard } from "../evidence/cards";
import { CostBreakdown } from "../evidence/Money";
import type { TimelineStep } from "../evidence/Progress";
import { EmptyState, InlineAlert, Skeleton } from "../feedback";
import { useToast } from "../Toast";

function steps(pathway: Pathway, chosen: boolean): TimelineStep[] {
  return pathway.steps.map((step, index) => ({
    title: step.name,
    when: step.months ? `about ${step.months} months` : undefined,
    status: chosen && index === 0 ? "current" : "future",
    leadsToPr: step.leads_to_pr,
  }));
}

/** Every pathway open to you, with what each costs, and "Make this my plan" (web.md §5). */
export function PathwaysView() {
  const router = useRouter();
  const toast = useToast();
  const pathways = useAllPathways();
  const plan = usePlan();
  const choose = useChoosePlan();
  const [error, setError] = useState<string | null>(null);
  const current = plan.data?.plan?.codes.join(">") ?? null;

  function pick(pathway: Pathway) {
    setError(null);
    choose.mutate(pathway.codes, {
      onSuccess: () => {
        toast({ message: `Your plan is now ${pathway.title}.` });
        router.push("/ai/plan");
      },
      onError: (err) =>
        setError(err instanceof ApiError ? err.message : "That didn't save. Try again."),
    });
  }

  return (
    <>
      <Link
        href="/ai/plan"
        className="mb-4 inline-flex items-center gap-1 text-body-s font-semibold text-accent hover:underline"
      >
        <ArrowLeft aria-hidden className="size-4" /> Your plan
      </Link>
      <h1 className="font-display text-h1 text-ink">Your pathways</h1>
      <p className="mt-2 mb-6 text-body-l text-muted">
        Every route or combination of routes open to you, best first. Costs are in naira at
        today&apos;s rate, with where each figure comes from.
      </p>
      {error && <InlineAlert tone="danger" title={error} className="mb-4" />}
      {pathways.isPending ? (
        <div className="space-y-4">
          <Skeleton className="h-56 w-full" />
          <Skeleton className="h-56 w-full" />
        </div>
      ) : pathways.isError ? (
        <InlineAlert
          tone="danger"
          title="We couldn't load your pathways. Reload the page to try again."
        />
      ) : !pathways.data?.length ? (
        <EmptyState icon={<Compass />} title="No pathways open yet">
          Nothing in your destination is open to you right now. Your route pages show what&apos;s
          missing and how to close it.
        </EmptyState>
      ) : (
        <>
          <h2 className="sr-only">Pathways, best first</h2>
          <ol className="space-y-6">
            {pathways.data.map((pathway, index) => {
              const chosen = pathway.codes.join(">") === current;
              const lines = costLines(pathway.cost.items);
              const spend = Number(pathway.cost.spend_ngn ?? 0);
              return (
                <li key={pathway.codes.join(">")}>
                  <PathwayCard
                    rank={index + 1}
                    title={pathway.title}
                    steps={steps(pathway, chosen)}
                    naira={spend > 0 || pathway.cost.complete ? spend : null}
                    months={pathway.months_to_arrival ?? 0}
                    leadsToPr={pathway.leads_to_pr}
                    probability={pathway.band}
                    chosen={chosen}
                    onChoose={() => pick(pathway)}
                  />
                  <details
                    className="mt-2 rounded-r-md border border-line bg-surface"
                    open={index === 0}
                  >
                    <summary className="cursor-pointer px-5 py-3 text-body-s font-semibold text-accent">
                      What it costs
                    </summary>
                    <div className="px-5 pb-5">
                      {lines.length ? (
                        <CostBreakdown lines={lines} />
                      ) : (
                        <p className="text-body-s text-muted">
                          Our researchers haven&apos;t priced this pathway yet.
                        </p>
                      )}
                      {pathway.cost.complete === false && lines.length > 0 && (
                        <p className="mt-2 text-body-s text-muted">
                          Some costs aren&apos;t priced yet, so the total is a floor.
                        </p>
                      )}
                    </div>
                  </details>
                </li>
              );
            })}
          </ol>
        </>
      )}
    </>
  );
}
