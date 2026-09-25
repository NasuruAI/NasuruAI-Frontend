"use client";

import { Bell, Bookmark, BriefcaseBusiness, ExternalLink, Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAnnouncer } from "@/components/ui/Announcer";
import { ApiError } from "@/lib/api";
import {
  checkRows,
  DEFAULT_FILTERS,
  type Job,
  type JobFilters,
  useJob,
  useJobs,
  useRequestPack,
  useSaveJob,
} from "@/lib/ai/jobs";
import { useMe } from "@/lib/ai/shell";
import { Button, ButtonLink } from "../Button";
import { Switch } from "../choice";
import { cx } from "../cx";
import { JobCard } from "../evidence/cards";
import { CheckList, FitScore, TrustMeter } from "../evidence/Trust";
import { EmptyState, InlineAlert, Skeleton } from "../feedback";
import { TextField } from "../fields";
import { COUNTRY_NAMES } from "../Flag";
import { Select } from "../Select";
import { ContextPanel, useIsXl } from "../shell/ContextPanel";
import { PrepareButton, SalaryText } from "./parts";

const SORTS = [
  { value: "fit", label: "Best fit" },
  { value: "recent", label: "Newest" },
  { value: "trust", label: "Most trusted" },
];

/** True when a key press belongs to a text field, not to the page's shortcuts. */
function typing(target: EventTarget | null): boolean {
  const element = target as HTMLElement | null;
  if (!element) return false;
  return element.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(element.tagName);
}

/** The selected job at xl: trust, fit and the way on, without leaving the list. */
function JobPreview({ id }: { id: string }) {
  const job = useJob(id);
  if (job.isPending) return <Skeleton className="h-64 w-full" />;
  if (job.isError) return <p className="text-body-s text-muted">We couldn&apos;t load this job.</p>;
  const data = job.data;
  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-display text-h3 text-ink">{data.title}</h3>
        <p className="text-body-s text-muted">
          {data.employer} · {data.location_text}
        </p>
        <p className="mt-2 text-body-s">
          <SalaryText job={data} />
        </p>
      </div>
      {data.trust_score !== null && <TrustMeter score={data.trust_score} />}
      <CheckList checks={checkRows(data.checks)} />
      <FitScore score={data.fit.score} reasons={data.fit.reasons} />
      <div className="flex flex-wrap gap-2">
        <PrepareButton jobId={data.id} size="sm" />
        <ButtonLink
          href={`/ai/jobs/${data.id}`}
          size="sm"
          icon={<ExternalLink aria-hidden className="size-4" />}
        >
          Full details
        </ButtonLink>
      </div>
    </div>
  );
}

/** /ai/jobs (web.md §7.1). */
export function JobsView() {
  const router = useRouter();
  const me = useMe();
  const { announce } = useAnnouncer();
  const isXl = useIsXl();
  const [draft, setDraft] = useState("");
  const [filters, setFilters] = useState<JobFilters>(DEFAULT_FILTERS);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(0);
  const [packError, setPackError] = useState<ApiError | null>(null);
  const jobs = useJobs(filters, page);
  const save = useSaveJob();
  const request = useRequestPack();
  const search = useRef<HTMLInputElement>(null);
  const items = useRef<Array<HTMLLIElement | null>>([]);

  const results = jobs.data?.results ?? [];
  const current: Job | undefined = results[Math.min(selected, results.length - 1)];
  const country = me.data?.destination
    ? (COUNTRY_NAMES[me.data.destination] ?? me.data.destination)
    : "";

  // Typing in the search box applies after a pause, not on every key.
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters((current) => (current.q === draft ? current : { ...current, q: draft }));
      setPage(1);
      setSelected(0);
    }, 400);
    return () => clearTimeout(timer);
  }, [draft]);

  function update(changes: Partial<JobFilters>) {
    setFilters((current) => ({ ...current, ...changes }));
    setPage(1);
    setSelected(0);
  }

  function prepare(job: Job) {
    setPackError(null);
    request.mutate(job.id, {
      onSuccess: (pack) => router.push(`/ai/packs/${pack.id}`),
      onError: (err) =>
        setPackError(err instanceof ApiError ? err : new ApiError("That didn't work.", 0)),
    });
  }

  function toggleSave(job: Job) {
    save.mutate({ id: job.id, saved: !job.saved });
    announce(job.saved ? `Removed ${job.title} from saved jobs` : `Saved ${job.title}`);
  }

  // Keyboard: j/k move, s save, p prepare answers, / search (web.md §7.1).
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey || typing(event.target)) return;
      if (event.key === "/") {
        event.preventDefault();
        search.current?.focus();
        return;
      }
      if (!results.length) return;
      if (event.key === "j" || event.key === "k") {
        event.preventDefault();
        const next = Math.max(
          0,
          Math.min(results.length - 1, selected + (event.key === "j" ? 1 : -1)),
        );
        setSelected(next);
        items.current[next]?.scrollIntoView({ block: "nearest" });
        announce(`${results[next].title}, ${results[next].employer}`);
      } else if (event.key === "s" && current) {
        event.preventDefault();
        toggleSave(current);
      } else if (event.key === "p" && current) {
        event.preventDefault();
        prepare(current);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const totalPages = jobs.data ? Math.max(1, Math.ceil(jobs.data.count / jobs.data.page_size)) : 1;

  return (
    <>
      <header className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-overline text-muted uppercase">Jobs</p>
          <h1 className="mt-1 font-display text-h1 text-ink">
            {country ? `Verified jobs in ${country}` : "Verified jobs"}
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <ButtonLink
            href="/ai/jobs/saved"
            size="sm"
            icon={<Bookmark aria-hidden className="size-4" />}
          >
            Saved
          </ButtonLink>
          <ButtonLink
            href="/ai/jobs/alerts"
            size="sm"
            icon={<Bell aria-hidden className="size-4" />}
          >
            Alerts
          </ButtonLink>
        </div>
      </header>

      <form
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          update({ q: draft });
        }}
        className="space-y-3 rounded-r-md border border-line bg-surface p-4"
      >
        <TextField
          ref={search}
          label="Search job titles"
          hideLabel
          type="search"
          placeholder="Search job titles, e.g. data analyst  ( / )"
          leading={<Search aria-hidden className="size-4" />}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
        />
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <Switch
            label="Remote only"
            checked={filters.remote}
            onChange={(remote) => update({ remote })}
          />
          <Switch
            label="Include caution jobs"
            description="Trust 40–59, shown with their warnings"
            checked={filters.include_caution}
            onChange={(include_caution) => update({ include_caution })}
          />
          <Select
            label="Sort"
            options={SORTS}
            value={filters.sort}
            onChange={(event) => update({ sort: event.target.value as JobFilters["sort"] })}
            className="w-44"
          />
        </div>
      </form>

      {packError &&
        (packError.status === 402 ? (
          <InlineAlert
            tone="warning"
            title="You've used this month's free answer packs"
            className="mt-4"
            action={
              <Link
                href="/ai/billing"
                className="font-semibold text-accent underline underline-offset-3"
              >
                See plans
              </Link>
            }
          >
            {packError.message}
          </InlineAlert>
        ) : (
          <InlineAlert tone="danger" title={packError.message} className="mt-4" />
        ))}

      <p role="status" className="mt-4 mb-3 text-body-s text-muted">
        {jobs.data && (
          <>
            <span className="font-semibold text-ink tabular-nums">
              {jobs.data.count.toLocaleString("en-GB")}
            </span>{" "}
            verified job{jobs.data.count === 1 ? "" : "s"}
            {jobs.data.explanation && <> · {jobs.data.explanation}</>}{" "}
            <Link href="/ai/how-ranking-works" className="text-accent underline underline-offset-3">
              How ranking works
            </Link>
          </>
        )}
      </p>

      {jobs.isPending ? (
        <div className="space-y-3" aria-busy="true" aria-label="Loading jobs">
          <Skeleton className="h-44 w-full" />
          <Skeleton className="h-44 w-full" />
        </div>
      ) : jobs.isError ? (
        <InlineAlert
          tone="danger"
          title={
            jobs.error instanceof ApiError && jobs.error.code === "no_destination"
              ? "Choose a destination to see its jobs."
              : "We couldn't load jobs."
          }
          action={
            <Button size="sm" variant="secondary" onClick={() => void jobs.refetch()}>
              Try again
            </Button>
          }
        />
      ) : !results.length ? (
        <EmptyState icon={<BriefcaseBusiness />} title="No verified jobs match">
          {filters.q || filters.remote
            ? "Try fewer words or turn off Remote only."
            : "New jobs are checked every day. Turn on alerts and we'll tell you when one fits."}
        </EmptyState>
      ) : (
        <>
          <p className="sr-only">
            Keyboard: j and k move, s saves, p prepares answers, slash searches.
          </p>
          <h2 className="sr-only">Results</h2>
          <ol className="space-y-3" aria-label="Jobs">
            {results.map((job, index) => (
              <li
                key={job.id}
                ref={(element) => {
                  items.current[index] = element;
                }}
                aria-current={index === selected ? "true" : undefined}
                onFocusCapture={() => setSelected(index)}
                className={cx("rounded-r-md", index === selected && "ring-2 ring-accent")}
              >
                <JobCard
                  title={job.title}
                  employer={job.employer}
                  location={job.remote ? `${job.location_text} · remote` : job.location_text}
                  salaryLine={<SalaryText job={job} />}
                  trust={job.trust_score ?? 0}
                  fit={job.fit}
                  postedAt={job.posted_at ?? undefined}
                  saved={job.saved}
                  href={`/ai/jobs/${job.id}`}
                  onSave={() => toggleSave(job)}
                  onPrepare={() => prepare(job)}
                />
              </li>
            ))}
          </ol>
          {totalPages > 1 && (
            <nav aria-label="Pages" className="mt-6 flex items-center justify-between gap-3">
              <Button
                variant="secondary"
                size="sm"
                disabled={page <= 1}
                onClick={() => {
                  setPage(page - 1);
                  setSelected(0);
                }}
              >
                Previous
              </Button>
              <span className="text-body-s text-muted tabular-nums">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="secondary"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => {
                  setPage(page + 1);
                  setSelected(0);
                }}
              >
                Next
              </Button>
            </nav>
          )}
        </>
      )}

      {isXl && current && (
        <ContextPanel title="Job preview" open={false} onClose={() => undefined}>
          <JobPreview id={current.id} />
        </ContextPanel>
      )}
    </>
  );
}
