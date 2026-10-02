"use client";

import { ClipboardCheck, Plus } from "lucide-react";
import Link from "next/link";
import { useMyApplications } from "@/lib/ai/my-application";
import { Button, ButtonLink } from "../Button";
import { EmptyState, InlineAlert, ProgressBar, Skeleton } from "../feedback";

/** /ai/my-application (plan §8): every school you've applied to through the
 * agency, with its staff-reviewed checklist — distinct from Track's
 * self-serve board. */
export function MyApplicationsView() {
  const applications = useMyApplications();
  const results = applications.data?.results ?? [];

  return (
    <>
      <header className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-overline text-muted uppercase">My application</p>
          <h1 className="mt-1 font-display text-h1 text-ink">Your schools and checklists</h1>
          <p className="mt-2 text-body text-muted">
            Every school you&apos;ve applied to through us, with the checklist your counsellor keeps
            reviewed.
          </p>
        </div>
        <ButtonLink
          href="/ai/my-application/new"
          size="sm"
          icon={<Plus aria-hidden className="size-4" />}
        >
          Add a school
        </ButtonLink>
      </header>

      {applications.isPending ? (
        <div className="space-y-3" aria-busy="true" aria-label="Loading your applications">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : applications.isError ? (
        <InlineAlert
          tone="danger"
          title="We couldn't load your applications."
          action={
            <Button size="sm" variant="secondary" onClick={() => void applications.refetch()}>
              Try again
            </Button>
          }
        />
      ) : !results.length ? (
        <EmptyState icon={<ClipboardCheck />} title="No schools yet">
          Add a school to get a checklist built from its actual requirements.
        </EmptyState>
      ) : (
        <ol className="space-y-3" aria-label="Your applications">
          {results.map((application) => (
            <li key={application.id}>
              <Link
                href={`/ai/my-application/${application.id}`}
                className="block rounded-r-md border border-line bg-surface p-5 transition-shadow duration-m-fast hover:shadow-e1"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="font-display text-h3 text-ink">{application.school_name}</h2>
                    <p className="text-body-s text-muted">
                      {application.programme_name}
                      {application.intake && ` · ${application.intake}`} ·{" "}
                      {application.status_display}
                    </p>
                  </div>
                </div>
                {application.checklist && (
                  <div className="mt-3">
                    <ProgressBar
                      value={application.checklist.verified_count}
                      max={Math.max(application.checklist.required_count, 1)}
                      label={`${application.checklist.verified_count} of ${application.checklist.required_count} required documents verified`}
                    />
                  </div>
                )}
              </Link>
            </li>
          ))}
        </ol>
      )}
    </>
  );
}
