"use client";

import { ArrowLeft, Bookmark, BookmarkCheck, ExternalLink, Flag, MapPin } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ApiError } from "@/lib/api";
import {
  checkRows,
  daysSince,
  DEFAULT_FILTERS,
  useJob,
  useJobs,
  useReportJob,
  useSaveJob,
} from "@/lib/ai/jobs";
import { Button } from "../Button";
import { cx } from "../cx";
import { JobCard } from "../evidence/cards";
import { CheckList, FitScore, TrustMeter } from "../evidence/Trust";
import { EmptyState, InlineAlert, Skeleton } from "../feedback";
import { PrepareButton, ReportDialog, SalaryText } from "./parts";

const EXCLUDED: Record<string, string> = {
  german: "This job needs German at B2 or above, which your profile doesn't show yet.",
};

function Similar({ id, title }: { id: string; title: string }) {
  const words = title.split(/\s+/).slice(0, 2).join(" ");
  const jobs = useJobs({ ...DEFAULT_FILTERS, q: words });
  const similar = (jobs.data?.results ?? []).filter((job) => job.id !== id).slice(0, 3);
  if (!similar.length) return null;
  return (
    <section aria-labelledby="similar-heading" className="mt-10">
      <h2 id="similar-heading" className="mb-3 font-display text-h2 text-ink">
        Similar jobs
      </h2>
      <ul className="grid gap-3 lg:grid-cols-3">
        {similar.map((job) => (
          <li key={job.id}>
            <JobCard
              title={job.title}
              employer={job.employer}
              location={job.location_text}
              salaryLine={<SalaryText job={job} />}
              trust={job.trust_score ?? 0}
              postedAt={job.posted_at ?? undefined}
              href={`/ai/jobs/${job.id}`}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}

/** The description the employer wrote, sanitised by the API, folded after 12 lines. */
function Description({ html }: { html: string }) {
  const [open, setOpen] = useState(false);
  // Offer "Show the full description" only when the fold actually hides something.
  const [clipped, setClipped] = useState(false);
  const body = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = body.current;
    if (!element) return;
    const observer = new ResizeObserver(() =>
      setClipped(element.scrollHeight > element.clientHeight + 1),
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [html]);
  if (!html.trim()) {
    return <p className="text-body text-muted">The employer didn&apos;t give a description.</p>;
  }
  return (
    <div>
      <div
        ref={body}
        className={cx(
          "prose-job max-w-[70ch] text-body text-ink [&_a]:text-accent [&_a]:underline [&_li]:ml-5 [&_li]:list-disc [&_p]:mb-3",
          !open && "line-clamp-[12]",
        )}
        // Sanitised with nh3 at ingestion (apps/ingestion/normalize.py).
        dangerouslySetInnerHTML={{ __html: html }}
      />
      {(clipped || open) && (
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
          className="mt-2 text-body-s font-semibold text-accent underline underline-offset-3"
        >
          {open ? "Show less" : "Show the full description"}
        </button>
      )}
    </div>
  );
}

/** /ai/jobs/[id] (web.md §7.2). */
export function JobDetailView({ id }: { id: string }) {
  const job = useJob(id);
  const save = useSaveJob();
  const report = useReportJob();
  const [reporting, setReporting] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);

  if (job.isPending) {
    return (
      <div aria-busy="true" aria-label="Loading the job" className="space-y-3">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  if (job.isError) {
    return (
      <EmptyState icon={<Flag />} title="This job isn't available">
        It may have closed, or failed our checks since you saw it.{" "}
        <Link href="/ai/jobs" className="text-accent underline underline-offset-3">
          Back to jobs
        </Link>
      </EmptyState>
    );
  }

  const data = job.data;
  const days = data.posted_at ? daysSince(data.posted_at) : null;

  return (
    <>
      <Link
        href="/ai/jobs"
        className="mb-4 inline-flex items-center gap-1 text-body-s font-semibold text-accent hover:underline"
      >
        <ArrowLeft aria-hidden className="size-4" /> Jobs
      </Link>
      <header className="mb-6 space-y-2">
        <h1 className="font-display text-h1 text-balance text-ink">{data.title}</h1>
        <p className="flex flex-wrap items-center gap-x-2 text-body text-muted">
          <span className="font-semibold text-ink">{data.employer}</span>
          <span aria-hidden>·</span>
          <span className="inline-flex items-center gap-1">
            <MapPin aria-hidden className="size-4" /> {data.location_text}
            {data.remote && " · remote"}
          </span>
          {days !== null && (
            <>
              <span aria-hidden>·</span>
              <span>
                {days <= 0 ? "Posted today" : `Posted ${days} day${days === 1 ? "" : "s"} ago`}
              </span>
            </>
          )}
        </p>
        <p className="text-body-l">
          <SalaryText job={data} short={false} showRate />
        </p>
        <div className="flex flex-wrap items-start gap-2 pt-2">
          <PrepareButton jobId={data.id} />
          <Button
            variant="secondary"
            aria-pressed={data.saved}
            icon={
              data.saved ? (
                <BookmarkCheck aria-hidden className="size-4" />
              ) : (
                <Bookmark aria-hidden className="size-4" />
              )
            }
            onClick={() => save.mutate({ id: data.id, saved: !data.saved })}
          >
            {data.saved ? "Saved" : "Save"}
          </Button>
          {data.apply_url && (
            <a
              href={data.apply_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-11 items-center gap-2 rounded-r-md border border-field-line px-4 text-body font-semibold text-ink hover:bg-sunken"
            >
              Apply on the employer&apos;s site
              <ExternalLink aria-hidden className="size-4" />
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          )}
        </div>
      </header>

      {data.fit.excluded && (
        <InlineAlert tone="warning" title="A requirement you don't meet yet" className="mb-6">
          {EXCLUDED[data.fit.excluded] ?? "This job needs something your profile doesn't show yet."}
        </InlineAlert>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <section
          aria-labelledby="trust-heading"
          className="rounded-r-md border border-line bg-surface p-5"
        >
          <h2 id="trust-heading" className="mb-3 text-h3 text-ink">
            Can you trust it?
          </h2>
          {data.trust_score !== null && <TrustMeter score={data.trust_score} />}
          {data.trust_band === "caution" && (
            <InlineAlert tone="warning" title="Caution" className="mt-3">
              Some checks didn&apos;t pass. Never pay a fee to apply, and check the company on its
              official register.
            </InlineAlert>
          )}
          <div className="mt-2">
            <CheckList checks={checkRows(data.checks)} />
          </div>
        </section>
        <section
          aria-labelledby="fit-heading"
          className="rounded-r-md border border-line bg-surface p-5"
        >
          <h2 id="fit-heading" className="mb-3 text-h3 text-ink">
            How well it fits you
          </h2>
          <FitScore score={data.fit.score} reasons={data.fit.reasons} />
          <p className="mt-3 text-body-s text-muted">
            Worked out from the details you confirmed.{" "}
            <Link href="/ai/how-ranking-works" className="text-accent underline underline-offset-3">
              How ranking works
            </Link>
          </p>
        </section>
      </div>

      <section aria-labelledby="description-heading" className="mt-8">
        <h2 id="description-heading" className="mb-3 font-display text-h2 text-ink">
          About the job
        </h2>
        <Description html={data.description_html} />
      </section>

      <p className="mt-8 text-body-s text-muted">
        Something wrong with this job?{" "}
        <button
          type="button"
          onClick={() => {
            report.reset();
            setReportError(null);
            setReporting(true);
          }}
          className="font-semibold text-accent underline underline-offset-3"
        >
          Report it as a scam
        </button>
      </p>

      <Similar id={data.id} title={data.title} />

      {reporting && (
        <ReportDialog
          open
          what="this job"
          onClose={() => setReporting(false)}
          pending={report.isPending}
          done={report.isSuccess}
          error={reportError}
          onSubmit={(input) =>
            report.mutate(
              { id: data.id, ...input },
              {
                onError: (err) =>
                  setReportError(
                    err instanceof ApiError ? err.message : "That didn't send. Try again.",
                  ),
              },
            )
          }
        />
      )}
    </>
  );
}
