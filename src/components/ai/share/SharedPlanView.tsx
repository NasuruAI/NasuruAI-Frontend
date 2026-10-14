"use client";

/**
 * /ai/share/[token]: what a parent or sponsor sees through a family link
 * (web.md §13). Public, no login, read-only. Shows the plan title, timeline,
 * cost in ₦ with the proof-of-funds split, and progress — nothing else about
 * the candidate (principle C6). A revoked or unknown token gets a plain
 * message, not an app error.
 */

import { arrivalMonth } from "@/lib/ai/plan";
import { type SharedPlan, useSharedPlan } from "@/lib/ai/share";
import { ApiError } from "@/lib/api";
import { formatNaira } from "../evidence/format";
import { Timeline, type TimelineStep } from "../evidence/Progress";
import { InlineAlert, Skeleton } from "../feedback";

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main id="main" className="mx-auto max-w-[640px] px-4 py-10 text-ink">
      {children}
    </main>
  );
}

export function SharedPlanView({ token }: { token: string }) {
  const shared = useSharedPlan(token);

  if (shared.isPending) {
    return (
      <Shell>
        <Skeleton className="h-8 w-40" />
        <Skeleton className="mt-4 h-40" />
      </Shell>
    );
  }

  if (shared.isError) {
    const gone = shared.error instanceof ApiError && shared.error.status === 404;
    return (
      <Shell>
        <p className="text-overline uppercase text-muted">Nasuru AI</p>
        <h1 className="mt-1 font-display text-h2 text-ink">
          {gone ? "This link isn't active" : "We couldn't load this plan"}
        </h1>
        <p className="mt-2 text-body text-muted">
          {gone
            ? "This share link has been revoked or never existed. Ask the person who sent it for a new one."
            : "Something went wrong loading this page. Try again in a moment."}
        </p>
      </Shell>
    );
  }

  return <Content data={shared.data} />;
}

function Content({ data }: { data: SharedPlan }) {
  const { shared_by, plan, progress } = data;
  const total = progress.done + progress.open;

  const steps: TimelineStep[] = (plan?.steps ?? []).map((step, index) => ({
    title: step.name,
    status: index === 0 ? "current" : "future",
  }));

  const spend = Number(plan?.cost.spend_ngn ?? 0);
  const proof = Number(plan?.cost.proof_of_funds_ngn ?? 0);
  const summary = [
    plan?.months_to_arrival ? `arrive around ${arrivalMonth(plan.months_to_arrival)}` : null,
    plan?.leads_to_pr ? "leads to permanent residence" : null,
  ].filter(Boolean);

  return (
    <Shell>
      <p className="text-overline uppercase text-muted">Shared with you · Nasuru AI</p>
      <h1 className="mt-1 font-display text-h1 text-balance text-ink">
        {plan?.title ?? `${shared_by}'s plan`}
      </h1>
      {plan && summary.length > 0 && (
        <p className="mt-2 text-body-l text-muted">{summary.join(" · ")}</p>
      )}

      {!plan && (
        <InlineAlert tone="info" title="No plan chosen yet" className="mt-6">
          {shared_by} hasn&apos;t picked a pathway yet. Check back once they have.
        </InlineAlert>
      )}

      {steps.length > 0 && (
        <section
          aria-label="Pathway"
          className="mt-8 rounded-r-md border border-line bg-surface p-5"
        >
          <Timeline steps={steps} />
        </section>
      )}

      {plan && (spend > 0 || proof > 0) && (
        <section aria-label="Cost" className="mt-6 rounded-r-md border border-line bg-surface p-5">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-h4 text-ink">Total cost</h2>
            <span className="text-metric tabular-nums text-ink">{formatNaira(spend)}</span>
          </div>
          {proof > 0 && (
            <p className="mt-2 text-body-s text-muted">
              Plus {formatNaira(proof)} shown as proof of funds — held in an account, not spent.
            </p>
          )}
          {plan.cost.complete === false && (
            <p className="mt-2 text-body-s text-muted">Some costs aren&apos;t priced yet.</p>
          )}
        </section>
      )}

      {plan && total > 0 && (
        <section className="mt-6" aria-label="Progress">
          <p className="text-body text-ink">
            <span className="font-semibold">{progress.done}</span> of {total} steps done
            {progress.open > 0 && <span className="text-muted">, {progress.open} to go</span>}.
          </p>
        </section>
      )}

      <footer className="mt-10 border-t border-line pt-4 text-body-s text-muted">
        Shared by {shared_by}. They can revoke this link at any time. You&apos;re seeing the plan
        only — no documents, answers or personal details.
      </footer>
    </Shell>
  );
}
