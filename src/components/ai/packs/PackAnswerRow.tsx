"use client";

import {
  Check,
  Copy,
  Download,
  FileText,
  Info,
  Loader2,
  Pencil,
  RefreshCw,
  Undo2,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useAnnouncer } from "@/components/ui/Announcer";
import { ApiError } from "@/lib/api";
import {
  downloadDocument,
  type GeneratedDoc,
  type PackAnswer,
  useEditAnswer,
  useMakeDocument,
  useRegenerate,
} from "@/lib/ai/packs";
import { Button } from "../Button";
import { Pill, type Tone } from "../Chip";
import { cx } from "../cx";
import { COPIED_MS } from "../evidence/AnswerRow";
import { InlineAlert } from "../feedback";
import { counterTone, TextArea } from "../fields";

export const KIND: Record<PackAnswer["kind"], { label: string; tone: Tone }> = {
  filled: { label: "From your profile", tone: "success" },
  written: { label: "Written from your profile", tone: "info" },
  you_answer: { label: "You answer", tone: "warning" },
  upload: { label: "Upload a file", tone: "neutral" },
  missing: { label: "Not in your profile", tone: "neutral" },
};

const quiet =
  "inline-flex h-9 items-center gap-1.5 rounded-r-sm px-3 text-body-s font-semibold text-accent hover:bg-accent-soft disabled:opacity-50";

/** The flag's guidance without the lead-in the alert already says. */
function flagDetail(guidance: string | undefined): string {
  return (guidance ?? "").replace(/^Check this before you use it\.\s*/, "");
}

function useCopy(label: string) {
  const { announce } = useAnnouncer();
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), COPIED_MS);
    return () => clearTimeout(timer);
  }, [copied]);
  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      announce(`${label} copied`);
    } catch {
      announce("Couldn't copy. Select the text and copy it instead.", true);
    }
  }
  return { copied, copy };
}

/** The tailored CV or cover letter for an upload field: make it, wait, download. */
function FileActions({
  kind,
  jobId,
  documents,
}: {
  kind: "cv" | "cover_letter";
  jobId: string;
  documents: GeneratedDoc[];
}) {
  const make = useMakeDocument();
  const [error, setError] = useState<ApiError | null>(null);
  const noun = kind === "cv" ? "CV" : "cover letter";
  const document = documents.find((item) => item.kind === kind && item.status !== "failed");
  const failed = documents.find((item) => item.kind === kind && item.status === "failed");

  async function download(format: "pdf" | "docx") {
    setError(null);
    try {
      await downloadDocument(document!, format);
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError("That download didn't work.", 0));
    }
  }

  return (
    <div className="mt-3 space-y-2">
      {document?.status === "ready" ? (
        <>
          <p className="text-body-s text-muted">
            Your tailored {noun}: {document.format_title}
            {document.pages ? `, ${document.pages} page${document.pages === 1 ? "" : "s"}` : ""}.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="secondary"
              icon={<Download aria-hidden className="size-4" />}
              onClick={() => void download("pdf")}
            >
              Download PDF
            </Button>
            <Button
              size="sm"
              variant="tertiary"
              icon={<Download aria-hidden className="size-4" />}
              onClick={() => void download("docx")}
            >
              Word
            </Button>
            <Link
              href={`/ai/cv/${document.id}`}
              className="inline-flex h-9 items-center px-3 text-body-s font-semibold text-accent hover:underline"
            >
              Edit in the CV studio
            </Link>
          </div>
        </>
      ) : document ? (
        <p role="status" className="flex items-center gap-2 text-body-s text-muted">
          <Loader2 aria-hidden className="size-4 animate-spin text-accent" />
          Writing your tailored {noun}…
        </p>
      ) : (
        <>
          {failed?.error && <p className="text-body-s text-muted">{failed.error}</p>}
          <Button
            size="sm"
            variant="secondary"
            loading={make.isPending}
            icon={<FileText aria-hidden className="size-4" />}
            onClick={() => {
              setError(null);
              make.mutate(
                { kind, job: jobId },
                {
                  onError: (err) =>
                    setError(err instanceof ApiError ? err : new ApiError("That didn't work.", 0)),
                },
              );
            }}
          >
            Make a tailored {noun}
          </Button>
        </>
      )}
      {error &&
        (error.status === 402 ? (
          <InlineAlert tone="warning" title="Your plan doesn't include more of these this month">
            <Link
              href="/ai/billing"
              className="font-semibold text-accent underline underline-offset-3"
            >
              See plans
            </Link>
          </InlineAlert>
        ) : (
          <InlineAlert tone="danger" title={error.message} />
        ))}
    </div>
  );
}

/**
 * One field of the form and its answer (web.md §8.1): copy, edit in place
 * with the form's exact limit, write again (the old text kept to compare),
 * and "Where this came from". A written answer's sentences each open the
 * facts they rest on.
 */
export function PackAnswerRow({
  packId,
  jobId,
  answer,
  documents,
  selected,
  selectedSentence,
  onSelect,
}: {
  packId: string;
  jobId: string;
  answer: PackAnswer;
  documents: GeneratedDoc[];
  selected: boolean;
  selectedSentence: number | null;
  onSelect: (answerId: string, sentence: number | null) => void;
}) {
  const edit = useEditAnswer(packId);
  const regenerate = useRegenerate(packId);
  const { copied, copy } = useCopy(answer.field.label);
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [comparing, setComparing] = useState<"draft" | "previous" | null>(null);

  const value = answer.value ?? "";
  const limit = answer.field.max_length ?? undefined;
  const kind = KIND[answer.kind];
  const labelId = `answer-${answer.id}`;
  const claims = !answer.edited && answer.kind === "written" ? answer.claims : [];
  const hasSources = (answer.fact_ids as string[] | undefined)?.length || answer.source;
  const fileKind = /cover/i.test(answer.field.label) ? "cover_letter" : "cv";

  function save(next: string) {
    setError(null);
    edit.mutate(
      { id: answer.id, value: next },
      {
        onSuccess: () => {
          setEditing(false);
          setComparing(null);
        },
        onError: (err) => setError(err instanceof ApiError ? err.message : "That didn't save."),
      },
    );
  }

  return (
    <article
      aria-labelledby={labelId}
      className={cx(
        "rounded-r-md border p-4",
        selected ? "border-line-strong bg-accent-soft" : "border-line bg-surface",
        answer.kind === "you_answer" && !selected && "border-warning-line bg-warning-bg",
      )}
    >
      <header className="flex flex-wrap items-center gap-2">
        <h3 id={labelId} className="font-semibold text-ink">
          {answer.field.label}
          {answer.field.required && (
            <>
              <span aria-hidden className="text-danger">
                {" "}
                *
              </span>
              <span className="sr-only"> (required)</span>
            </>
          )}
        </h3>
        <Pill tone={kind.tone}>{kind.label}</Pill>
        {limit && !editing && value && answer.kind !== "upload" && (
          <span
            className={cx(
              "ml-auto text-metric-s tabular-nums",
              counterTone(value.length, limit) === "danger" ? "text-danger" : "text-muted",
            )}
          >
            {value.length} / {limit}
          </span>
        )}
      </header>

      {editing ? (
        <form
          className="mt-3 space-y-2"
          onSubmit={(event) => {
            event.preventDefault();
            save(text);
          }}
        >
          <TextArea
            label={`Your answer to ${answer.field.label}`}
            hideLabel
            rows={limit && limit <= 255 ? 2 : 6}
            maxChars={limit}
            value={text}
            // eslint-disable-next-line jsx-a11y/no-autofocus -- the person just chose Edit
            autoFocus
            onChange={(event) => setText(event.target.value)}
          />
          {error && (
            <p role="alert" className="text-body-s text-danger">
              {error}
            </p>
          )}
          <div className="flex gap-2">
            <Button
              type="submit"
              size="sm"
              loading={edit.isPending}
              disabled={Boolean(limit && text.length > limit)}
            >
              Save
            </Button>
            <Button type="button" size="sm" variant="tertiary" onClick={() => setEditing(false)}>
              Cancel
            </Button>
          </div>
        </form>
      ) : answer.kind === "upload" ? (
        <>
          <p className="mt-2 text-body text-ink">{answer.guidance}</p>
          <FileActions kind={fileKind} jobId={jobId} documents={documents} />
        </>
      ) : claims.length ? (
        <p className="mt-2 text-body text-ink">
          {claims.map((claim, index) => (
            <span key={`${index}-${claim.sentence.slice(0, 20)}`}>
              <button
                type="button"
                aria-pressed={selected && selectedSentence === index}
                onClick={() => onSelect(answer.id, index)}
                className={cx(
                  "rounded-r-sm text-left decoration-accent/40 underline-offset-4 hover:underline",
                  selected && selectedSentence === index && "bg-highlight",
                )}
              >
                {claim.sentence}
              </button>{" "}
            </span>
          ))}
        </p>
      ) : value ? (
        <p className="mt-2 text-body whitespace-pre-wrap text-ink">{value}</p>
      ) : null}

      {!editing && (answer.kind === "you_answer" || answer.kind === "missing") && (
        <p className={cx("text-body text-ink", value && "mt-2 text-body-s text-muted")}>
          {answer.guidance ||
            (answer.kind === "missing"
              ? "This isn't in your profile yet. Type it in the form, or add it to your profile."
              : "Answer this one yourself.")}
        </p>
      )}

      {!editing && answer.flagged && !answer.edited && (
        <InlineAlert tone="warning" title="Check this before you use it" className="mt-3">
          {flagDetail(answer.guidance)}
        </InlineAlert>
      )}

      {answer.regenerating && (
        <p role="status" className="mt-2 flex items-center gap-2 text-body-s text-muted">
          <Loader2 aria-hidden className="size-4 animate-spin text-accent" />
          Writing this again…
        </p>
      )}

      {!editing && (answer.edited ? answer.draft : answer.previous) && (
        <div className="mt-3 rounded-r-sm bg-sunken p-3 text-body-s">
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-muted">
            <span>{answer.edited ? "You edited our draft." : "Written again."}</span>
            <button
              type="button"
              aria-expanded={comparing !== null}
              onClick={() => setComparing(comparing ? null : answer.edited ? "draft" : "previous")}
              className="font-semibold text-accent underline underline-offset-3"
            >
              {comparing
                ? "Hide"
                : answer.edited
                  ? "Show our draft"
                  : "Compare with the previous version"}
            </button>
          </p>
          {comparing && (
            <div className="mt-2 space-y-2">
              <p className="whitespace-pre-wrap text-ink">
                {comparing === "draft" ? answer.draft : answer.previous}
              </p>
              <Button
                size="sm"
                variant="tertiary"
                icon={<Undo2 aria-hidden className="size-4" />}
                loading={edit.isPending}
                onClick={() => save((comparing === "draft" ? answer.draft : answer.previous) ?? "")}
              >
                {comparing === "draft" ? "Use our draft" : "Use the previous version"}
              </Button>
            </div>
          )}
        </div>
      )}

      {!editing && answer.kind !== "upload" && (
        <footer className="mt-3 flex flex-wrap items-center gap-1">
          {value && (
            <button
              type="button"
              onClick={() => void copy(value)}
              className="inline-flex h-9 items-center gap-1.5 rounded-r-sm border border-field-line px-3 text-body-s font-semibold text-ink hover:bg-sunken"
            >
              {copied ? (
                <Check aria-hidden className="size-4 text-success" />
              ) : (
                <Copy aria-hidden className="size-4" />
              )}
              {copied ? "Copied" : "Copy"} <span className="sr-only">{answer.field.label}</span>
            </button>
          )}
          <button
            type="button"
            className={quiet}
            onClick={() => {
              setText(value);
              setError(null);
              setEditing(true);
            }}
          >
            <Pencil aria-hidden className="size-4" />
            {value ? "Edit" : "Write your answer"}{" "}
            <span className="sr-only">{answer.field.label}</span>
          </button>
          {answer.regenerations_left > 0 && (
            <button
              type="button"
              className={quiet}
              disabled={answer.regenerating || regenerate.isPending}
              onClick={() =>
                regenerate.mutate(answer.id, {
                  onError: (err) =>
                    setError(err instanceof ApiError ? err.message : "That didn't start."),
                })
              }
            >
              <RefreshCw aria-hidden className="size-4" />
              Write again <span className="sr-only">{answer.field.label}</span>{" "}
              <span className="font-normal text-muted">({answer.regenerations_left} left)</span>
            </button>
          )}
          {hasSources ? (
            <button
              type="button"
              aria-pressed={selected}
              onClick={() => onSelect(answer.id, null)}
              className={quiet}
            >
              <Info aria-hidden className="size-4" />
              Where this came from <span className="sr-only">({answer.field.label})</span>
            </button>
          ) : null}
        </footer>
      )}
      {!editing && error && (
        <p role="alert" className="mt-2 text-body-s text-danger">
          {error}
        </p>
      )}
    </article>
  );
}
