"use client";

import { ArrowLeft, Bell, Bookmark } from "lucide-react";
import Link from "next/link";
import {
  useAlertHistory,
  useAlertSettings,
  useSavedJobs,
  useSaveJob,
  useUpdateAlerts,
} from "@/lib/ai/jobs";
import { Pill } from "../Chip";
import { Switch } from "../choice";
import { JobCard } from "../evidence/cards";
import { formatDate } from "../evidence/format";
import { EmptyState, InlineAlert, Skeleton } from "../feedback";
import { Select } from "../Select";
import { SalaryText } from "./parts";

function Back() {
  return (
    <Link
      href="/ai/jobs"
      className="mb-4 inline-flex items-center gap-1 text-body-s font-semibold text-accent hover:underline"
    >
      <ArrowLeft aria-hidden className="size-4" /> Jobs
    </Link>
  );
}

/** /ai/jobs/saved: kept even after a job closes, marked so. */
export function SavedJobsView() {
  const saved = useSavedJobs();
  const save = useSaveJob();
  return (
    <>
      <Back />
      <h1 className="mb-6 font-display text-h1 text-ink">Saved jobs</h1>
      {saved.isPending ? (
        <Skeleton className="h-44 w-full" />
      ) : saved.isError ? (
        <InlineAlert tone="danger" title="We couldn't load your saved jobs." />
      ) : !saved.data.length ? (
        <EmptyState icon={<Bookmark />} title="Nothing saved yet">
          Save a job from the list (or press s) and it waits for you here.
        </EmptyState>
      ) : (
        <>
          <h2 className="sr-only">Your saved jobs</h2>
          <ul className="space-y-3">
            {saved.data.map((job) => (
              <li key={job.id}>
                {!job.available && (
                  <Pill tone="warning" className="mb-2">
                    {job.closed ? "Closed" : "No longer listed"}
                  </Pill>
                )}
                <JobCard
                  title={job.title}
                  employer={job.employer}
                  location={job.location_text}
                  salaryLine={<SalaryText job={job} />}
                  trust={job.trust_score ?? 0}
                  postedAt={job.posted_at ?? undefined}
                  saved
                  href={`/ai/jobs/${job.id}`}
                  onSave={() =>
                    save.mutate(
                      { id: job.id, saved: false },
                      { onSuccess: () => void saved.refetch() },
                    )
                  }
                />
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}

const MIN_FIT = [50, 60, 70, 80, 90].map((value) => ({
  value: String(value),
  label: `${value} or more`,
}));
const MAX_JOBS = [1, 3, 5, 10, 20].map((value) => ({
  value: String(value),
  label: `${value} job${value === 1 ? "" : "s"}`,
}));

/** /ai/jobs/alerts: new matches, at most one digest a day, never the same job twice (US-204). */
export function JobAlertsView() {
  const settings = useAlertSettings();
  const update = useUpdateAlerts();
  const history = useAlertHistory();
  const data = settings.data;

  return (
    <>
      <Back />
      <h1 className="font-display text-h1 text-ink">Job alerts</h1>
      <p className="mt-2 mb-6 max-w-[65ch] text-body-l text-muted">
        When new verified jobs fit you well, we send one digest a day at most, and never the same
        job twice.
      </p>
      {settings.isPending ? (
        <Skeleton className="h-40 w-full" />
      ) : settings.isError || !data ? (
        <InlineAlert tone="danger" title="We couldn't load your alert settings." />
      ) : (
        <section
          aria-labelledby="alert-settings"
          className="max-w-xl space-y-5 rounded-r-md border border-line bg-surface p-5"
        >
          <h2 id="alert-settings" className="sr-only">
            Settings
          </h2>
          <Switch
            label="Send me job alerts"
            checked={Boolean(data.enabled)}
            onChange={(enabled) => update.mutate({ enabled })}
          />
          <Select
            label="Only jobs with a fit of"
            options={MIN_FIT}
            value={String(data.min_fit ?? 70)}
            disabled={!data.enabled}
            onChange={(event) => update.mutate({ min_fit: Number(event.target.value) })}
          />
          <Select
            label="At most, per digest"
            options={MAX_JOBS}
            value={String(data.max_jobs ?? 5)}
            disabled={!data.enabled}
            onChange={(event) => update.mutate({ max_jobs: Number(event.target.value) })}
          />
          <p className="text-body-s text-muted">
            Choose WhatsApp, push or email in{" "}
            <Link
              href="/ai/settings/notifications"
              className="text-accent underline underline-offset-3"
            >
              notification settings
            </Link>
            .{data.last_digest_on && ` Last digest: ${formatDate(data.last_digest_on)}.`}
          </p>
          <p role="status" className="min-h-5 text-body-s text-muted">
            {update.isPending ? "Saving…" : update.isError ? "" : update.isSuccess ? "Saved" : ""}
          </p>
          {update.isError && <InlineAlert tone="danger" title="That didn't save. Try again." />}
        </section>
      )}

      <section aria-labelledby="alert-history" className="mt-8 max-w-xl">
        <h2 id="alert-history" className="mb-3 text-h3 text-ink">
          Sent to you
        </h2>
        {history.isPending ? (
          <Skeleton className="h-24 w-full" />
        ) : !history.data?.length ? (
          <EmptyState icon={<Bell />} title="No alerts yet">
            Your first digest arrives when a new job fits you well.
          </EmptyState>
        ) : (
          <ul className="divide-y divide-line rounded-r-md border border-line">
            {history.data.map((sent) => (
              <li
                key={`${sent.job}-${sent.digest_on}`}
                className="flex items-baseline gap-3 px-4 py-3"
              >
                <span className="min-w-0 flex-1">
                  <Link
                    href={`/ai/jobs/${sent.job}`}
                    className="font-semibold text-ink hover:underline hover:underline-offset-3"
                  >
                    {sent.title}
                  </Link>
                  <span className="block text-body-s text-muted">{sent.employer}</span>
                </span>
                <span className="text-body-s text-muted tabular-nums">
                  {sent.fit_score} fit · {formatDate(sent.digest_on)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
