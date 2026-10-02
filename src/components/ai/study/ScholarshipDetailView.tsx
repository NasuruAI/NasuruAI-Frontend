"use client";

import { ArrowLeft, Award, ExternalLink, Home } from "lucide-react";
import Link from "next/link";
import {
  ELIGIBILITY_STATUS,
  scholarshipCheckRows,
  scholarshipValueText,
  useScholarship,
} from "@/lib/ai/study";
import { Pill } from "../Chip";
import { CountdownChip, StatusPill } from "../evidence/Status";
import { CheckList } from "../evidence/Trust";
import { EmptyState, Skeleton } from "../feedback";

/** /ai/study/scholarships/[id] (web.md §10.3): why you do or don't qualify. */
export function ScholarshipDetailView({
  id,
  country = "",
  level = "",
}: {
  id: string;
  country?: string;
  level?: string;
}) {
  const scholarship = useScholarship(id, country, level);

  if (scholarship.isPending) {
    return (
      <div aria-busy="true" aria-label="Loading the scholarship" className="space-y-3">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }
  if (scholarship.isError) {
    return (
      <EmptyState icon={<Award />} title="We couldn't find that scholarship">
        <Link href="/ai/study/scholarships" className="text-accent underline underline-offset-3">
          See scholarships
        </Link>
      </EmptyState>
    );
  }

  const data = scholarship.data;

  return (
    <>
      <Link
        href="/ai/study/scholarships"
        className="mb-4 inline-flex items-center gap-1 text-body-s font-semibold text-accent hover:underline"
      >
        <ArrowLeft aria-hidden className="size-4" /> Scholarships
      </Link>
      <header className="mb-6">
        <div className="flex flex-wrap items-start gap-3">
          <h1 className="font-display text-h1 text-balance text-ink">{data.name}</h1>
          <StatusPill status={ELIGIBILITY_STATUS[data.status]} className="mt-2" />
        </div>
        <p className="mt-2 text-body text-muted">{data.provider}</p>
        <p className="mt-2 text-h3 font-semibold text-ink">{scholarshipValueText(data)}</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {data.return_home_required && (
            <Pill tone="warning" icon={<Home aria-hidden className="size-3.5" />}>
              You must return home after
            </Pill>
          )}
          {data.deadline && <CountdownChip date={data.deadline} label="Closes" />}
        </div>
        {data.return_home_note && (
          <p className="mt-2 text-body-s text-muted">{data.return_home_note}</p>
        )}
        {data.url && (
          <a
            href={data.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-1.5 text-body-s font-semibold text-accent hover:underline"
          >
            Official page
            <ExternalLink aria-hidden className="size-3.5" />
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        )}
      </header>

      <h2 className="mb-3 text-h3 text-ink">Can I get this?</h2>
      <CheckList checks={scholarshipCheckRows(data.checks)} />
    </>
  );
}
