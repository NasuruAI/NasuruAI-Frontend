"use client";

import { Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ApiError } from "@/lib/api";
import { type CompareRow, stepHref, useCompare } from "@/lib/ai/onboarding";
import { useChooseDestination, useDestination } from "@/lib/ai/shell";
import { ButtonLink } from "../Button";
import { cx } from "../cx";
import { ConfirmDialog } from "../Dialog";
import { StatusPill, type StatusKind } from "../evidence/Status";
import { InlineAlert, Skeleton } from "../feedback";
import { Flag } from "../Flag";
import { StepActions, StepIntro } from "./OnboardingFrame";

const STATUSES = ["eligible", "eligible_if", "not_eligible", "blocked"];

function CountryCard({
  row,
  active,
  onPick,
}: {
  row: CompareRow;
  active: boolean;
  onPick: () => void;
}) {
  const route = row.best_route;
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onPick}
      className={cx(
        "flex h-full w-full flex-col gap-3 rounded-r-md border bg-surface p-4 text-left transition-shadow duration-m-fast hover:shadow-e1",
        active ? "border-accent ring-2 ring-accent" : "border-line",
      )}
    >
      <span className="flex w-full items-center gap-2">
        <Flag country={row.country} size={24} />
        <span className="flex-1 font-display text-h4 text-ink">{row.name}</span>
        {active && <Check aria-label="Your destination" className="size-5 text-accent" />}
      </span>
      {route && row.best_status && STATUSES.includes(row.best_status) ? (
        <>
          <StatusPill status={row.best_status as StatusKind} className="self-start" />
          <span className="text-body-s text-ink">
            Best route: <span className="font-semibold">{route.name}</span>
          </span>
          {route.typical_months_to_arrival ? (
            <span className="text-body-s text-muted tabular-nums">
              about {route.typical_months_to_arrival} months to arrive
            </span>
          ) : null}
        </>
      ) : (
        <span className="text-body-s text-muted">No routes checked for your profile yet.</span>
      )}
    </button>
  );
}

export function DestinationStep() {
  const router = useRouter();
  const compare = useCompare();
  const destination = useDestination();
  const choose = useChooseDestination();
  const [pending, setPending] = useState<CompareRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const active = destination.data?.active?.country ?? null;

  function pick(row: CompareRow) {
    setError(null);
    if (row.country === active) router.push(stepHref("results"));
    else setPending(row);
  }

  function confirm() {
    if (!pending) return;
    choose.mutate(pending.country, {
      onSuccess: () => {
        setPending(null);
        router.push(stepHref("results"));
      },
      onError: (err) => {
        setPending(null);
        setError(err instanceof ApiError ? err.message : "That didn't save. Try again.");
      },
    });
  }

  return (
    <>
      <StepIntro
        title="Choose your destination"
        lead="Here's the best route for you in each country. Pick one to focus on: everything you see after this is about it."
      />
      {error && <InlineAlert tone="danger" title={error} className="mb-4" />}
      {compare.isPending ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-36 w-full" />
          ))}
        </div>
      ) : compare.isError ? (
        <InlineAlert
          tone="danger"
          title="We couldn't load the comparison. Reload the page to try again."
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {(compare.data ?? []).map((row) => (
            <li key={row.country}>
              <CountryCard row={row} active={row.country === active} onPick={() => pick(row)} />
            </li>
          ))}
        </ul>
      )}
      <p className="mt-4 text-body-s text-muted">
        Comparing is free, now and later. You can switch country once every 30 days.
      </p>
      <StepActions back={stepHref("occupation")}>
        {active ? (
          <ButtonLink href={stepHref("results")} variant="primary" size="lg">
            Continue
          </ButtonLink>
        ) : (
          <span className="text-body-s text-muted">Choose a country to continue.</span>
        )}
      </StepActions>
      <ConfirmDialog
        open={pending !== null}
        onClose={() => setPending(null)}
        onConfirm={confirm}
        loading={choose.isPending}
        title={pending ? `Focus on ${pending.name}?` : ""}
        confirmLabel={pending ? `Choose ${pending.name}` : "Choose"}
      >
        <p className="text-body text-ink">
          You work on one country at a time, so your plan, jobs and deadlines are all about it.
        </p>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-body text-muted">
          <li>You can compare all seven countries for free whenever you like.</li>
          <li>
            {active
              ? "Switching archives your current plan. You can switch again after 30 days."
              : "If you change your mind within 24 hours, you can switch once without waiting."}
          </li>
        </ul>
      </ConfirmDialog>
    </>
  );
}
