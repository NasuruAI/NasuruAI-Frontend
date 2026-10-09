"use client";

/**
 * Interview practice (web.md §11.6, web-build F13): choose a job or an
 * interview type, start a session, then its history with a progress chart.
 */

import { Mic } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { ApiError } from "@/lib/api";
import {
  type InterviewKind,
  INTERVIEW_KINDS,
  KIND_BLURB,
  KIND_LABEL,
  useSessions,
  useStartSession,
} from "@/lib/ai/coaching";
import { useJob } from "@/lib/ai/jobs";
import { useEligibility } from "@/lib/ai/onboarding";
import { Button, ButtonLink } from "../Button";
import { Pill } from "../Chip";
import { formatDate } from "../evidence/format";
import { EmptyState, InlineAlert, Skeleton } from "../feedback";
import { Select } from "../Select";
import { ProgressChart } from "./ProgressChart";

function KindCard({
  kind,
  selected,
  disabled,
  onSelect,
}: {
  kind: InterviewKind;
  selected: boolean;
  disabled?: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      aria-pressed={selected}
      className={`rounded-r-md border p-4 text-left transition-colors duration-m-fast ease-m disabled:cursor-not-allowed disabled:opacity-50 ${
        selected
          ? "border-accent bg-accent-soft"
          : "border-line bg-surface hover:border-line-strong"
      }`}
    >
      <p className="font-semibold text-ink">{KIND_LABEL[kind]}</p>
      <p className="mt-1 text-body-s text-muted">{KIND_BLURB[kind]}</p>
    </button>
  );
}

export function InterviewHome() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const jobId = searchParams.get("job") ?? undefined;
  const job = useJob(jobId ?? "");
  const eligibility = useEligibility(true);
  const sessions = useSessions();
  const start = useStartSession();

  const [kind, setKind] = useState<InterviewKind>(jobId ? "job" : "visa");
  const [route, setRoute] = useState("");
  const [error, setError] = useState<string | null>(null);

  const routeOptions = [
    { value: "", label: "Any route" },
    ...(eligibility.data?.results ?? []).map((result) => ({
      value: result.route.code,
      label: `${result.route.name} (${result.route.country})`,
    })),
  ];

  function begin() {
    if (kind === "job" && !jobId) {
      setError("Open this from a job you're tracking to practise for it.");
      return;
    }
    setError(null);
    start.mutate(
      { kind, job: kind === "job" ? jobId : undefined, route: kind !== "job" ? route : undefined },
      {
        onSuccess: (session) => router.push(`/ai/interview/${session.id}`),
        onError: (err) =>
          setError(err instanceof ApiError ? err.message : "We couldn't start that. Try again."),
      },
    );
  }

  const completed = (sessions.data ?? []).filter((s) => s.status === "complete" && s.summary);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-h2 text-ink">Interview practice</h1>
        <p className="mt-1 text-body text-muted">
          Answer by voice or typing, question by question, with feedback on content, clarity,
          structure and pace.
        </p>
      </div>

      <div className="space-y-4 rounded-r-md border border-line bg-surface p-5">
        <div className="grid gap-3 sm:grid-cols-2">
          {INTERVIEW_KINDS.map((option) => (
            <KindCard
              key={option}
              kind={option}
              selected={kind === option}
              onSelect={() => setKind(option)}
            />
          ))}
        </div>

        {kind === "job" &&
          (jobId ? (
            <p className="text-body-s text-ink">
              Practising for{" "}
              <span className="font-semibold">{job.data ? job.data.title : "this job"}</span>.
            </p>
          ) : (
            <InlineAlert tone="info" title="Open this from a job you're tracking">
              Job interviews are written from the posting itself. Go to a job or your{" "}
              <Link href="/ai/track" className="underline">
                board
              </Link>{" "}
              and choose Prepare for interview.
            </InlineAlert>
          ))}

        {kind !== "job" && (
          <Select
            label="Route"
            helper="Optional, but gives you questions written for it."
            options={routeOptions}
            value={route}
            onChange={(event) => setRoute(event.target.value)}
          />
        )}

        {error && <InlineAlert tone="danger" title={error} />}

        <Button
          icon={<Mic aria-hidden className="size-4" />}
          loading={start.isPending}
          onClick={begin}
        >
          Start practising
        </Button>
      </div>

      {completed.length > 1 && (
        <section>
          <h2 className="text-h3 text-ink">Your progress</h2>
          <div className="mt-3 rounded-r-md border border-line p-4">
            <ProgressChart sessions={completed} />
          </div>
        </section>
      )}

      <section>
        <h2 className="text-h3 text-ink">Past sessions</h2>
        {sessions.isPending ? (
          <Skeleton className="mt-3 h-24" />
        ) : !sessions.data?.length ? (
          <EmptyState icon={<Mic aria-hidden />} title="No practice yet">
            Start your first session above.
          </EmptyState>
        ) : (
          <ul className="mt-3 divide-y divide-line rounded-r-md border border-line">
            {sessions.data.map((session) => (
              <li key={session.id}>
                <ButtonLink
                  href={`/ai/interview/${session.id}`}
                  variant="tertiary"
                  className="flex w-full items-center justify-between gap-3 rounded-none px-4 py-3 text-left"
                >
                  <span>
                    <span className="font-semibold text-ink">
                      {session.job_title || session.kind_label}
                    </span>
                    <span className="ml-2 text-body-s text-muted">
                      {formatDate(session.created_at)}
                    </span>
                  </span>
                  <span className="flex items-center gap-2">
                    {session.summary && (
                      <Pill tone="accent">{session.summary.overall.toFixed(1)}/5</Pill>
                    )}
                    {session.status === "preparing" && (
                      <span className="text-body-s text-muted">Preparing…</span>
                    )}
                    {session.status === "failed" && <Pill tone="danger">Failed</Pill>}
                  </span>
                </ButtonLink>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
