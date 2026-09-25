"use client";

import { Briefcase } from "lucide-react";
import { useState } from "react";
import { ApiError } from "@/lib/api";
import {
  searchOccupations,
  stepHref,
  useFacts,
  useOccupation,
  useOccupationSuggestions,
  useSetOccupation,
} from "@/lib/ai/onboarding";
import { ButtonLink } from "../Button";
import { RadioGroup } from "../choice";
import { InlineAlert, Skeleton } from "../feedback";
import { Combobox, type ComboboxOption } from "../Select";
import { StepActions, StepIntro } from "./OnboardingFrame";

export const SYSTEM_LABEL: Record<string, string> = {
  isco08: "ISCO-08",
  soc2020: "UK SOC",
  noc2021: "Canada NOC",
  kldb2010: "Germany KldB",
  onet: "US O*NET",
};

const key = (system: string, code: string) => `${system}:${code}`;

/** "UK SOC 2425 · Canada NOC 21223 · …" from the crosswalk the API returns. */
function MappedCodes({ mapped }: { mapped: unknown }) {
  const entries = Object.entries((mapped ?? {}) as Record<string, string[]>).filter(
    ([, codes]) => codes.length,
  );
  if (!entries.length) {
    return (
      <p className="text-body-s text-muted">
        We couldn&apos;t match this to other countries&apos; codes yet. Staff will add it.
      </p>
    );
  }
  return (
    <dl className="grid gap-x-4 gap-y-1 sm:grid-cols-[auto_1fr]">
      {entries.map(([system, codes]) => (
        <div key={system} className="contents">
          <dt className="text-body-s text-muted">{SYSTEM_LABEL[system] ?? system}</dt>
          <dd className="font-mono text-body-s text-ink">{codes.join(", ")}</dd>
        </div>
      ))}
    </dl>
  );
}

export function OccupationStep() {
  const occupation = useOccupation();
  const suggestions = useOccupationSuggestions();
  const choose = useSetOccupation();
  const facts = useFacts();
  const hasJob = (facts.data ?? []).some(
    (fact) => fact.kind === "work" && fact.status === "confirmed",
  );
  const [searched, setSearched] = useState<ComboboxOption | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Shown checked at once; the saved choice takes over when it returns.
  const [picked, setPicked] = useState<string | null>(null);

  const current = occupation.data;
  const currentKey =
    choose.isPending || choose.isError
      ? picked
      : current
        ? key(current.system, current.code)
        : picked;

  function pick(system: string, code: string) {
    setError(null);
    setPicked(key(system, code));
    choose.mutate(
      { system, code },
      {
        onError: (err) => {
          setPicked(null);
          setError(err instanceof ApiError ? err.message : "That didn't save. Try again.");
        },
      },
    );
  }

  const options = (suggestions.data ?? []).map((suggestion) => ({
    value: key(suggestion.system, suggestion.code),
    label: suggestion.title,
    description: (
      <>
        <span className="font-mono">
          {SYSTEM_LABEL[suggestion.system] ?? suggestion.system} {suggestion.code}
        </span>{" "}
        · matches your role &ldquo;{suggestion.matched_title}&rdquo;
      </>
    ),
  }));

  return (
    <>
      <StepIntro
        title="What's your occupation?"
        lead="Visa lists, salary floors and shortage lists all use occupation codes. Pick the one closest to the work you do."
      />
      <div className="space-y-6">
        {suggestions.isPending ? (
          <Skeleton className="h-40 w-full" />
        ) : options.length > 0 ? (
          <RadioGroup
            legend="Suggested from your CV"
            value={options.some((option) => option.value === currentKey) ? currentKey : null}
            options={options}
            onChange={(value) => {
              const [system, code] = value.split(":");
              pick(system, code);
            }}
          />
        ) : (
          <p className="flex items-start gap-2 text-body text-muted">
            <Briefcase aria-hidden className="mt-0.5 size-5 shrink-0" />
            {hasJob
              ? "We couldn't match your job title to a code. Search for your occupation instead."
              : "We suggest codes from the jobs you confirmed. Search for your occupation instead."}
          </p>
        )}

        <Combobox
          label={options.length ? "Not one of these? Search" : "Search for your occupation"}
          placeholder="e.g. data analyst"
          helper="Search by job title. We show the international code; your destination's codes follow from it."
          value={searched}
          onChange={(option) => {
            setSearched(option);
            if (option) {
              const [system, code] = option.value.split(":");
              pick(system, code);
            }
          }}
          search={async (query) =>
            (await searchOccupations(query)).map((result) => ({
              value: key(result.system, result.code),
              label: result.title,
              code: `${SYSTEM_LABEL[result.system] ?? result.system} ${result.code}`,
            }))
          }
        />

        {error && <InlineAlert tone="danger" title={error} />}

        {current && (
          <section
            aria-labelledby="chosen-heading"
            aria-live="polite"
            className="space-y-3 rounded-r-md border border-line bg-surface p-5"
          >
            <p className="text-overline text-muted uppercase">Your occupation</p>
            <h2 id="chosen-heading" className="text-h3 text-ink">
              {current.title}{" "}
              <span className="font-mono text-body text-muted">
                {SYSTEM_LABEL[current.system] ?? current.system} {current.code}
              </span>
            </h2>
            <MappedCodes mapped={current.mapped} />
          </section>
        )}

        <InlineAlert tone="info" title="Why these codes matter">
          The UK checks your job against its SOC code, Canada against NOC and TEER, Germany against
          KldB. The wrong code can put you on the wrong salary floor or miss a shortage list. You
          can change it later in your profile.
        </InlineAlert>
      </div>
      <StepActions back={stepHref("facts")}>
        {current ? (
          <ButtonLink href={stepHref("destination")} variant="primary" size="lg">
            Continue
          </ButtonLink>
        ) : (
          <span className="text-body-s text-muted">Choose an occupation to continue.</span>
        )}
      </StepActions>
    </>
  );
}
