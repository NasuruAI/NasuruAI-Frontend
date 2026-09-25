"use client";

import {
  ArrowLeft,
  CircleCheck,
  ClipboardCopy,
  ExternalLink,
  FileWarning,
  PenLine,
  Send,
  Upload,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAnnouncer } from "@/components/ui/Announcer";
import { ApiError } from "@/lib/api";
import {
  allAnswers,
  isBuilding,
  type Pack,
  packAsText,
  useJobCard,
  useJobDocuments,
  useMarkApplied,
  usePack,
  useRetryPack,
} from "@/lib/ai/packs";
import { Button, ButtonLink } from "../Button";
import { TaskProgress, type ProgressStep } from "../evidence/Progress";
import { formatDate } from "../evidence/format";
import { EmptyState, InlineAlert, Skeleton } from "../feedback";
import { ContextPanel } from "../shell/ContextPanel";
import { useToast } from "../Toast";
import { PackAnswerRow } from "./PackAnswerRow";
import { SourcePanel } from "./SourcePanel";

const ATS: Record<string, string> = { greenhouse: "Greenhouse", lever: "Lever", ashby: "Ashby" };

const sectionId = (name: string) => `section-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

/** "Reading the form ✓ → Answering 12 of 19… → Your pack". */
export function buildSteps(pack: Pick<Pack, "status" | "progress">): ProgressStep[] {
  const reading = pack.status === "queued" || pack.status === "reading_form";
  const progress = pack.progress;
  const count =
    progress?.total && progress.done !== undefined
      ? ` (${progress.done} of ${progress.total})`
      : "";
  return [
    { label: "Reading the form", state: reading ? "active" : "done" },
    {
      label: `Answering from your profile${count}`,
      state: reading ? "pending" : pack.status === "answering" ? "active" : "done",
    },
    { label: "Your pack", state: pack.status === "ready" ? "done" : "pending" },
  ];
}

function Summary({ pack }: { pack: Pack }) {
  const counts = pack.counts;
  const ready = (counts.filled ?? 0) + (counts.written ?? 0);
  const built = pack.completed_at ?? pack.created_at;
  const time = new Date(built).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  return (
    <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-body-s text-muted">
      <span className="inline-flex items-center gap-1">
        <CircleCheck aria-hidden className="size-4 text-success" /> {ready} ready
      </span>
      {counts.you_answer > 0 && (
        <span className="inline-flex items-center gap-1">
          <PenLine aria-hidden className="size-4 text-warning" /> {counts.you_answer} you answer
        </span>
      )}
      {counts.upload > 0 && (
        <span className="inline-flex items-center gap-1">
          <Upload aria-hidden className="size-4" /> {counts.upload} file
          {counts.upload === 1 ? "" : "s"}
        </span>
      )}
      {counts.missing > 0 && <span>{counts.missing} not in your profile</span>}
      {pack.form?.ats && <span>{ATS[pack.form.ats] ?? pack.form.ats}</span>}
      {pack.status === "ready" && (
        <span>
          built {formatDate(built)} {time}
        </span>
      )}
    </p>
  );
}

function Failed({ pack }: { pack: Pack }) {
  const router = useRouter();
  const retry = useRetryPack();
  const [error, setError] = useState<string | null>(null);
  if (pack.error_code === "form_unsupported") {
    return (
      <InlineAlert
        tone="info"
        title="This form needs the Nasuru extension"
        action={
          <ButtonLink href="/ai/settings/extension" size="sm">
            Set up the extension
          </ButtonLink>
        }
      >
        {pack.error}
      </InlineAlert>
    );
  }
  if (pack.error_code === "quota_exceeded") {
    return (
      <InlineAlert
        tone="warning"
        title="You've used this month's answer packs"
        action={
          <Link
            href="/ai/billing"
            className="font-semibold text-accent underline underline-offset-3"
          >
            See plans
          </Link>
        }
      >
        {pack.error} You haven&apos;t been charged for this one.
      </InlineAlert>
    );
  }
  return (
    <InlineAlert
      tone="danger"
      title="We couldn't make this pack"
      action={
        <Button
          size="sm"
          variant="secondary"
          loading={retry.isPending}
          onClick={() =>
            retry.mutate(pack.job, {
              onSuccess: (next) => router.push(`/ai/packs/${next.id}`),
              onError: (err) =>
                setError(err instanceof ApiError ? err.message : "That didn't work. Try again."),
            })
          }
        >
          Try again
        </Button>
      }
    >
      {error ?? pack.error ?? "Something went wrong while reading the form."}
    </InlineAlert>
  );
}

/** Copy all as text, and Mark as applied (moves the card, schedules the follow-up). */
function Finish({ pack }: { pack: Pack }) {
  const toast = useToast();
  const { announce } = useAnnouncer();
  const card = useJobCard(pack.job);
  const mark = useMarkApplied();
  const [error, setError] = useState<string | null>(null);
  const applied = card.data?.state === "applied" || mark.data?.state === "applied";
  const appliedAt = mark.data?.applied_at ?? card.data?.applied_at;

  async function copyAll() {
    try {
      await navigator.clipboard.writeText(packAsText(pack));
      announce(`Copied ${allAnswers(pack).length} answers as text`);
      toast({ message: "Copied all answers as a numbered list" });
    } catch {
      announce("Couldn't copy. Try again.", true);
    }
  }

  return (
    <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-line pt-5">
      <Button
        variant="secondary"
        icon={<ClipboardCopy aria-hidden className="size-4" />}
        onClick={() => void copyAll()}
      >
        Copy all as text
      </Button>
      {applied ? (
        <p className="inline-flex items-center gap-1.5 text-body font-semibold text-success">
          <CircleCheck aria-hidden className="size-5" />
          Applied{appliedAt ? ` on ${formatDate(appliedAt)}` : ""}
        </p>
      ) : (
        <Button
          icon={<Send aria-hidden className="size-4" />}
          loading={mark.isPending}
          onClick={() => {
            setError(null);
            mark.mutate(pack.job, {
              onSuccess: () =>
                toast({
                  message: "Marked as applied. We'll remind you to follow up in 10 working days.",
                }),
              onError: (err) =>
                setError(err instanceof ApiError ? err.message : "That didn't save. Try again."),
            });
          }}
        >
          Mark as applied
        </Button>
      )}
      {error && (
        <p role="alert" className="w-full text-body-s text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

/** /ai/packs/[id] (web.md §8.1). */
export function PackView({ id }: { id: string }) {
  const pack = usePack(id);
  const documents = useJobDocuments(pack.data?.job);
  const [selected, setSelected] = useState<{ answer: string; sentence: number | null } | null>(
    null,
  );

  if (pack.isPending) {
    return (
      <div aria-busy="true" aria-label="Loading the pack" className="space-y-3">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }
  if (pack.isError) {
    return (
      <EmptyState icon={<FileWarning />} title="This pack isn't available">
        It may have been removed.{" "}
        <Link href="/ai/packs" className="text-accent underline underline-offset-3">
          Your answer packs
        </Link>
      </EmptyState>
    );
  }

  const data = pack.data;
  const building = isBuilding(data.status);
  const answers = allAnswers(data);
  const chosen = answers.find((answer) => answer.id === selected?.answer) ?? null;

  return (
    <>
      <Link
        href="/ai/packs"
        className="mb-4 inline-flex items-center gap-1 text-body-s font-semibold text-accent hover:underline"
      >
        <ArrowLeft aria-hidden className="size-4" /> Answer packs
      </Link>
      <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-2">
          <h1 className="font-display text-h1 text-balance text-ink">
            Answers for {data.employer} · {data.job_title}
          </h1>
          <Summary pack={data} />
        </div>
        {data.form?.apply_url && (
          <a
            href={data.form.apply_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-11 shrink-0 items-center gap-2 rounded-r-md border border-field-line px-4 text-body font-semibold text-ink hover:bg-sunken"
          >
            Open form
            <ExternalLink aria-hidden className="size-4" />
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        )}
      </header>

      {building && (
        <div className="mb-6">
          <TaskProgress title="Preparing your answers" steps={buildSteps(data)} />
        </div>
      )}
      {data.status === "failed" && (
        <div className="mb-6">
          <Failed pack={data} />
        </div>
      )}
      {data.form?.note && (
        <InlineAlert
          tone="info"
          title="Some questions are only on the form itself"
          className="mb-6"
        >
          {data.form.note}
        </InlineAlert>
      )}

      <div className="space-y-8">
        {data.sections.map((section) => (
          <section key={section.section} aria-labelledby={sectionId(section.section)}>
            <h2 id={sectionId(section.section)} className="mb-3 text-overline text-muted uppercase">
              {section.section}
            </h2>
            <div className="space-y-3">
              {section.answers.map((answer) => (
                <PackAnswerRow
                  key={answer.id}
                  packId={data.id}
                  jobId={data.job}
                  answer={answer}
                  documents={documents.data ?? []}
                  selected={selected?.answer === answer.id}
                  selectedSentence={selected?.answer === answer.id ? selected.sentence : null}
                  onSelect={(answerId, sentence) => setSelected({ answer: answerId, sentence })}
                />
              ))}
            </div>
          </section>
        ))}
      </div>

      {data.status === "ready" && <Finish pack={data} />}

      <ContextPanel title="Source" open={chosen !== null} onClose={() => setSelected(null)}>
        <SourcePanel pack={data} answer={chosen} sentence={selected?.sentence ?? null} />
      </ContextPanel>
    </>
  );
}
