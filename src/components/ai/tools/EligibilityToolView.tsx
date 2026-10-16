"use client";

import { useMutation } from "@tanstack/react-query";
import { Compass } from "lucide-react";
import { useState } from "react";
import { ai, unwrap } from "@/lib/ai/client";
import type { EligibilityResult } from "@/lib/ai/onboarding";
import { Button } from "../Button";
import { ButtonLink } from "../Button";
import { StatusPill, type StatusKind } from "../evidence/Status";
import { InlineAlert, Skeleton } from "../feedback";
import { TextField } from "../fields";
import { Select } from "../Select";
import { ToolShell } from "./ToolShell";

type EligibilityResponse = { country: string; results: EligibilityResult[] };

const COUNTRIES = [
  { value: "", label: "Choose a country" },
  { value: "DE", label: "Germany" },
  { value: "GB", label: "United Kingdom" },
  { value: "CA", label: "Canada" },
  { value: "IE", label: "Ireland" },
  { value: "NL", label: "Netherlands" },
  { value: "CH", label: "Switzerland" },
  { value: "US", label: "United States" },
];
const EDUCATION = [
  { value: "", label: "Not sure" },
  { value: "secondary", label: "Secondary school" },
  { value: "vocational", label: "Vocational qualification" },
  { value: "diploma", label: "Diploma / OND / HND" },
  { value: "bachelor", label: "Bachelor's degree" },
  { value: "master", label: "Master's degree" },
  { value: "doctorate", label: "Doctorate (PhD)" },
];
const ENGLISH = [
  { value: "", label: "Not sure" },
  { value: "A2", label: "Basic (A2)" },
  { value: "B1", label: "Intermediate (B1)" },
  { value: "B2", label: "Upper intermediate (B2, IELTS ~5.5–6.0)" },
  { value: "C1", label: "Advanced (C1, IELTS ~7.0)" },
  { value: "C2", label: "Fluent (C2)" },
  { value: "native", label: "Native" },
];
const SAVINGS = [
  { value: "", label: "Prefer not to say" },
  { value: "under_1m", label: "Under ₦1m" },
  { value: "1m_5m", label: "₦1m–₦5m" },
  { value: "5m_15m", label: "₦5m–₦15m" },
  { value: "15m_40m", label: "₦15m–₦40m" },
  { value: "over_40m", label: "Over ₦40m" },
];

function topLine(result: EligibilityResult): string {
  if (result.gaps[0]) return result.gaps[0].text;
  const reasons = Array.isArray(result.reasons) ? (result.reasons as unknown[]) : [];
  if (typeof reasons[0] === "string") return reasons[0];
  return result.status === "eligible"
    ? "You meet every requirement we check."
    : "See the full plan for the details.";
}

function useEligibilityTool() {
  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      unwrap(
        ai.POST("/api/ai/v1/tools/eligibility/", { body: body as never }),
      ) as unknown as Promise<EligibilityResponse>,
  });
}

export function EligibilityToolView() {
  const check = useEligibilityTool();
  const [v, setV] = useState<Record<string, string>>({ country: "" });

  function set(key: string, value: string) {
    setV((current) => ({ ...current, [key]: value }));
  }

  const answered = [
    "country",
    "age",
    "education",
    "work_years",
    "english",
    "savings_band",
    "dependants",
  ].filter((k) => v[k]).length;

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const body: Record<string, unknown> = { country: v.country };
    if (v.age) body.age = Number(v.age);
    if (v.education) body.education = v.education;
    if (v.work_years) body.work_years = Number(v.work_years);
    if (v.english) body.english = v.english;
    if (v.savings_band) body.savings_band = v.savings_band;
    if (v.dependants) body.dependants = Number(v.dependants);
    check.mutate(body);
  }

  const results = check.data?.results ?? [];

  const form = (
    <form onSubmit={submit} className="space-y-5 rounded-r-md border border-line bg-surface p-5">
      <p className="text-body-s text-muted">{answered} of 7 answered</p>
      <Select
        label="Where do you want to go?"
        options={COUNTRIES}
        value={v.country}
        onChange={(e) => set("country", e.target.value)}
      />
      <TextField
        label="Your age"
        type="number"
        inputMode="numeric"
        min={16}
        max={100}
        value={v.age ?? ""}
        onChange={(e) => set("age", e.target.value)}
      />
      <Select
        label="Highest education"
        options={EDUCATION}
        value={v.education ?? ""}
        onChange={(e) => set("education", e.target.value)}
      />
      <TextField
        label="Years of skilled work experience"
        type="number"
        inputMode="numeric"
        min={0}
        max={50}
        value={v.work_years ?? ""}
        onChange={(e) => set("work_years", e.target.value)}
      />
      <Select
        label="English level"
        options={ENGLISH}
        value={v.english ?? ""}
        onChange={(e) => set("english", e.target.value)}
      />
      <Select
        label="Savings available"
        options={SAVINGS}
        value={v.savings_band ?? ""}
        onChange={(e) => set("savings_band", e.target.value)}
      />
      <TextField
        label="Dependants travelling with you"
        type="number"
        inputMode="numeric"
        min={0}
        max={20}
        value={v.dependants ?? ""}
        onChange={(e) => set("dependants", e.target.value)}
      />
      <Button type="submit" loading={check.isPending} disabled={!v.country} className="w-full">
        Check my routes
      </Button>
    </form>
  );

  const resultPanel = (
    <div className="space-y-3">
      {check.isPending ? (
        <div aria-busy="true" aria-label="Checking your routes" className="space-y-3">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
      ) : check.isError ? (
        <InlineAlert tone="danger" title="We couldn't check that">
          Choose a destination and try again.
        </InlineAlert>
      ) : check.isSuccess ? (
        results.length > 0 ? (
          <>
            <p className="text-body-s text-muted">
              The honest answer first — blocked routes are shown before the rest.
            </p>
            {results.map((result) => (
              <div
                key={result.route.code}
                className="rounded-r-md border border-line bg-surface p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h3 className="font-semibold text-ink">{result.route.name}</h3>
                  <StatusPill status={result.status as StatusKind} />
                </div>
                <p className="mt-2 text-body-s text-ink">{topLine(result)}</p>
                {result.route.typical_months_to_arrival != null && (
                  <p className="mt-1 text-caption text-muted tabular-nums">
                    about {result.route.typical_months_to_arrival} months
                  </p>
                )}
              </div>
            ))}
            <div className="rounded-r-md border border-info-line bg-info-bg p-4">
              <p className="text-body-s text-ink">
                Want all seven countries compared side by side, with costs and the exact rules?
              </p>
              <ButtonLink href="/ai/signup" size="sm" className="mt-2">
                See my full plan — free
              </ButtonLink>
            </div>
          </>
        ) : (
          <InlineAlert tone="info" title="No routes to show for that country yet" />
        )
      ) : (
        <div className="rounded-r-md border border-line bg-surface p-5 py-8 text-center">
          <Compass aria-hidden className="mx-auto size-8 text-subtle" />
          <p className="mt-3 text-body text-muted">
            Answer what you can and we&apos;ll show which legal routes you qualify for — with the
            honest answer first.
          </p>
        </div>
      )}
    </div>
  );

  return (
    <ToolShell
      title="Am I eligible to move abroad?"
      blurb="Check which legal routes you qualify for in under two minutes — free, no account. Every result shows the rule behind it."
      form={form}
      result={resultPanel}
    />
  );
}
