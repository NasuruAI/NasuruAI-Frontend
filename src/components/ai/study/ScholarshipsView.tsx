"use client";

import { Award } from "lucide-react";
import { useState } from "react";
import { useMe } from "@/lib/ai/shell";
import {
  scholarshipValueText,
  STUDY_LEVEL_LABEL,
  STUDY_LEVELS,
  useScholarships,
} from "@/lib/ai/study";
import { Button } from "../Button";
import { COUNTRY_NAMES } from "../Flag";
import { ScholarshipCard } from "../evidence/cards";
import { EmptyState, InlineAlert, Skeleton } from "../feedback";
import { Select } from "../Select";

/** /ai/study/scholarships (web.md §10.3): scholarships you could hold. */
export function ScholarshipsView() {
  const me = useMe();
  const [country, setCountry] = useState("");
  const [level, setLevel] = useState("");
  const activeCountry = country || me.data?.destination || "";
  const scholarships = useScholarships(activeCountry, level);

  return (
    <>
      <header className="mb-4">
        <p className="text-overline text-muted uppercase">Study</p>
        <h1 className="mt-1 font-display text-h1 text-ink">Scholarships you could hold</h1>
        <p className="mt-2 text-body text-muted">
          Only ones open to your nationality and level, with their deadline.
        </p>
      </header>

      <div className="mb-4 flex flex-wrap gap-4 rounded-r-md border border-line bg-surface p-4">
        <Select
          label="Destination"
          options={[
            { value: "", label: "Your destination" },
            ...Object.entries(COUNTRY_NAMES).map(([code, name]) => ({ value: code, label: name })),
          ]}
          value={country}
          onChange={(event) => setCountry(event.target.value)}
          className="w-56"
        />
        <Select
          label="Level"
          options={[
            { value: "", label: "Any level" },
            ...STUDY_LEVELS.map((value) => ({ value, label: STUDY_LEVEL_LABEL[value] })),
          ]}
          value={level}
          onChange={(event) => setLevel(event.target.value)}
          className="w-48"
        />
      </div>

      {scholarships.isPending ? (
        <div className="space-y-3" aria-busy="true" aria-label="Loading scholarships">
          <Skeleton className="h-36 w-full" />
          <Skeleton className="h-36 w-full" />
        </div>
      ) : scholarships.isError ? (
        <InlineAlert
          tone="danger"
          title="We couldn't load scholarships."
          action={
            <Button size="sm" variant="secondary" onClick={() => void scholarships.refetch()}>
              Try again
            </Button>
          }
        />
      ) : !scholarships.data?.length ? (
        <EmptyState icon={<Award />} title="No scholarships match">
          Try a different destination or level.
        </EmptyState>
      ) : (
        <>
          <h2 className="sr-only">Results</h2>
          <ol className="space-y-3" aria-label="Scholarships">
            {scholarships.data.map((scholarship) => (
              <li key={scholarship.id}>
                <ScholarshipCard
                  name={scholarship.name}
                  sponsor={scholarship.provider}
                  value={scholarshipValueText(scholarship)}
                  awards={scholarship.awards_count ?? undefined}
                  deadline={scholarship.deadline ?? undefined}
                  returnHome={Boolean(scholarship.return_home_required)}
                  href={`/ai/study/scholarships/${scholarship.id}?country=${activeCountry}&level=${level}`}
                />
              </li>
            ))}
          </ol>
        </>
      )}
    </>
  );
}
