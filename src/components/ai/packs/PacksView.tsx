"use client";

import { ArrowLeft, ExternalLink, FileText, Link2, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ApiError } from "@/lib/api";
import { isBuilding, type PackSummary, usePackFromUrl, usePacks } from "@/lib/ai/packs";
import { Button, ButtonLink } from "../Button";
import { Pill, type Tone } from "../Chip";
import { formatDate } from "../evidence/format";
import { EmptyState, InlineAlert, Skeleton } from "../feedback";
import { TextField } from "../fields";

function status(pack: PackSummary): { label: string; tone: Tone } {
  if (pack.status === "ready") return { label: "Ready", tone: "success" };
  if (pack.status === "failed") return { label: "Couldn't be made", tone: "danger" };
  return { label: "Writing answers…", tone: "info" };
}

/** /ai/packs: every pack, newest first. */
export function PacksView() {
  const packs = usePacks();
  return (
    <>
      <header className="mb-2 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-overline text-muted uppercase">Jobs</p>
          <h1 className="mt-1 font-display text-h1 text-ink">Answer packs</h1>
        </div>
        <ButtonLink href="/ai/packs/new" size="sm" icon={<Link2 aria-hidden className="size-4" />}>
          New from a job link
        </ButtonLink>
      </header>
      <p className="mb-6 max-w-[65ch] text-body-l text-muted">
        Every field of an application form, answered from your confirmed facts, with where each
        answer came from.
      </p>
      {packs.isPending ? (
        <div className="space-y-3" aria-busy="true" aria-label="Loading your packs">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : packs.isError ? (
        <InlineAlert
          tone="danger"
          title="We couldn't load your answer packs."
          action={
            <Button size="sm" variant="secondary" onClick={() => void packs.refetch()}>
              Try again
            </Button>
          }
        />
      ) : !packs.data.length ? (
        <EmptyState icon={<FileText />} title="No answer packs yet">
          Choose Prepare answers on a verified job, or{" "}
          <Link href="/ai/packs/new" className="text-accent underline underline-offset-3">
            paste a job link
          </Link>
          .
        </EmptyState>
      ) : (
        <>
          <h2 className="sr-only">Your packs</h2>
          <ul className="divide-y divide-line rounded-r-md border border-line bg-surface">
            {packs.data.map((pack) => {
              const pill = status(pack);
              return (
                <li key={pack.id}>
                  <Link
                    href={`/ai/packs/${pack.id}`}
                    className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 hover:bg-sunken"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold text-ink">{pack.job_title}</span>
                      <span className="block text-body-s text-muted">
                        {pack.employer} · {formatDate(pack.completed_at ?? pack.created_at)}
                      </span>
                    </span>
                    <Pill tone={pill.tone}>{pill.label}</Pill>
                  </Link>
                </li>
              );
            })}
          </ul>
          {packs.data.some((pack) => isBuilding(pack.status)) && (
            <p className="mt-3 text-body-s text-muted">
              Packs being written update here on their own.
            </p>
          )}
        </>
      )}
    </>
  );
}

const WHY: Record<string, { title: string; tone: "info" | "warning" }> = {
  needs_extension: { title: "This form needs you to sign in", tone: "info" },
  not_listed: { title: "We can't prepare this one here yet", tone: "info" },
  unknown_site: { title: "We don't recognise this form", tone: "info" },
  failed_checks: { title: "This job didn't pass our checks", tone: "warning" },
};

/** /ai/packs/new (web.md §8.2): paste any job link. */
export function NewPackView() {
  const router = useRouter();
  const fromUrl = usePackFromUrl();
  const [url, setUrl] = useState("");
  const [problem, setProblem] = useState<ApiError | null>(null);
  const [tried, setTried] = useState("");

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const link = url.trim();
    if (!link) {
      setProblem(
        new ApiError("Paste the job's link first.", 400, { url: ["Paste the job's link first."] }),
      );
      return;
    }
    setProblem(null);
    setTried(link.includes("://") ? link : `https://${link}`);
    fromUrl.mutate(link, {
      onSuccess: (pack) => router.push(`/ai/packs/${pack.id}`),
      onError: (err) =>
        setProblem(err instanceof ApiError ? err : new ApiError("That didn't work. Try again.", 0)),
    });
  }

  const why = problem?.code ? WHY[problem.code] : undefined;
  const fieldError = problem?.fieldErrors?.url?.[0];

  return (
    <>
      <Link
        href="/ai/packs"
        className="mb-4 inline-flex items-center gap-1 text-body-s font-semibold text-accent hover:underline"
      >
        <ArrowLeft aria-hidden className="size-4" /> Answer packs
      </Link>
      <h1 className="font-display text-h1 text-ink">New pack from a job link</h1>
      <p className="mt-2 mb-6 max-w-[65ch] text-body-l text-muted">
        Paste the link to a job or its application form. If it&apos;s a job we&apos;ve checked, we
        read its form and answer every field from your confirmed facts.
      </p>

      <form noValidate onSubmit={submit} className="max-w-2xl space-y-4">
        <TextField
          label="Job link"
          type="url"
          inputMode="url"
          autoComplete="url"
          placeholder="https://boards.greenhouse.io/…"
          value={url}
          error={fieldError}
          onChange={(event) => setUrl(event.target.value)}
        />
        <Button
          type="submit"
          size="lg"
          loading={fromUrl.isPending}
          icon={<Sparkles aria-hidden className="size-4" />}
        >
          Prepare answers
        </Button>
      </form>

      {problem && !fieldError && (
        <div className="mt-6 max-w-2xl">
          {problem.status === 402 ? (
            <InlineAlert
              tone="warning"
              title="You've used this month's free answer packs"
              action={
                <Link
                  href="/ai/billing"
                  className="font-semibold text-accent underline underline-offset-3"
                >
                  See plans
                </Link>
              }
            >
              {problem.message}
            </InlineAlert>
          ) : why ? (
            <InlineAlert tone={why.tone} title={why.title}>
              <p>{problem.message}</p>
              <p className="mt-3 flex flex-wrap gap-3">
                {problem.code === "failed_checks" ? (
                  <Link
                    href="/ai/check-offer"
                    className="font-semibold text-accent underline underline-offset-3"
                  >
                    Check an offer
                  </Link>
                ) : (
                  <Link
                    href="/ai/settings/extension"
                    className="font-semibold text-accent underline underline-offset-3"
                  >
                    Set up the extension
                  </Link>
                )}
                {problem.code !== "failed_checks" && tried && (
                  <a
                    href={tried}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-semibold text-accent underline underline-offset-3"
                  >
                    Open the form <ExternalLink aria-hidden className="size-3.5" />
                    <span className="sr-only"> (opens in a new tab)</span>
                  </a>
                )}
              </p>
            </InlineAlert>
          ) : (
            <InlineAlert tone="danger" title={problem.message} />
          )}
        </div>
      )}
    </>
  );
}
