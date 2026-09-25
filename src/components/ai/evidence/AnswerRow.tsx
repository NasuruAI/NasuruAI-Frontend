"use client";

/**
 * One answer in an answer pack (design-system §8.2).
 *
 * States: ready; you answer (sensitive fields: no pre-fill, guidance only);
 * file (which tailored document to upload); over the limit (danger counter);
 * copied (a tick for 2 s, announced).
 */

import { Check, Copy, FileText, Info, Pencil, ThumbsDown, ThumbsUp } from "lucide-react";
import { useEffect, useState } from "react";
import { useAnnouncer } from "@/components/ui/Announcer";
import { cx } from "../cx";
import { counterTone } from "../fields";
import { SourceLine, type Source } from "./Source";
import { StatusPill } from "./Status";

export type AnswerKind = "filled" | "written" | "you_answer" | "file";

export type Answer = {
  id: string;
  label: string;
  fieldType: string;
  kind: AnswerKind;
  answer: string;
  maxChars?: number;
  source?: Source;
  /** For `you_answer`: how to answer it yourself. For `file`: which document. */
  guidance?: string;
};

export const COPIED_MS = 2000;

export function AnswerRow({
  answer,
  onEdit,
  onFeedback,
  onSelect,
  selected = false,
}: {
  answer: Answer;
  onEdit?: (answer: Answer) => void;
  onFeedback?: (answer: Answer, right: boolean) => void;
  /** Shows the fact a written answer came from (the context panel, H3). */
  onSelect?: (answer: Answer) => void;
  selected?: boolean;
}) {
  const { announce } = useAnnouncer();
  const [copied, setCopied] = useState(false);
  const [rated, setRated] = useState<boolean | null>(null);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), COPIED_MS);
    return () => clearTimeout(timer);
  }, [copied]);

  const over = answer.maxChars ? counterTone(answer.answer.length, answer.maxChars) : "ok";
  const youAnswer = answer.kind === "you_answer";
  const file = answer.kind === "file";

  async function copy() {
    try {
      await navigator.clipboard.writeText(answer.answer);
      setCopied(true);
      announce(`${answer.label} copied`);
    } catch {
      announce("Couldn't copy. Select the text and copy it instead.", true);
    }
  }

  return (
    <article
      aria-label={answer.label}
      className={cx(
        "rounded-r-md border p-4",
        selected ? "border-line-strong bg-accent-soft" : "border-line",
        youAnswer && "border-warning-line bg-warning-bg",
      )}
    >
      <header className="flex flex-wrap items-center gap-2">
        <h3 className="font-semibold text-ink">{answer.label}</h3>
        <span className="rounded-full bg-sunken px-2 text-caption text-muted">
          {answer.fieldType}
        </span>
        {youAnswer && <StatusPill status="you_answer" />}
        {answer.maxChars && !youAnswer && !file && (
          <span
            className={cx(
              "ml-auto text-metric-s tabular-nums",
              over === "ok" && "text-muted",
              over === "warning" && "text-warning",
              over === "danger" && "text-danger",
            )}
          >
            {answer.answer.length} / {answer.maxChars}
            {over === "danger" && <span className="sr-only"> — over the form&apos;s limit</span>}
          </span>
        )}
      </header>

      {youAnswer ? (
        <p className="mt-2 text-body text-ink">{answer.guidance}</p>
      ) : file ? (
        <p className="mt-2 flex items-start gap-2 text-body text-ink">
          <FileText aria-hidden className="mt-0.5 size-4 shrink-0 text-muted" />
          {answer.guidance ?? answer.answer}
        </p>
      ) : (
        <p className="mt-2 text-body whitespace-pre-wrap text-ink">{answer.answer}</p>
      )}

      {answer.source && !youAnswer && <SourceLine source={answer.source} className="mt-2" />}

      {!youAnswer && !file && (
        <footer className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={copy}
            className="inline-flex h-9 items-center gap-1.5 rounded-r-sm border border-field-line px-3 text-body-s font-semibold text-ink hover:bg-sunken"
          >
            {copied ? (
              <Check aria-hidden className="size-4 text-success" />
            ) : (
              <Copy aria-hidden className="size-4" />
            )}
            {copied ? "Copied" : "Copy"}
          </button>
          {onSelect && answer.kind === "written" && (
            <button
              type="button"
              aria-pressed={selected}
              onClick={() => onSelect(answer)}
              className="inline-flex h-9 items-center gap-1.5 rounded-r-sm px-3 text-body-s font-semibold text-accent hover:bg-accent-soft"
            >
              <Info aria-hidden className="size-4" /> Where this came from
            </button>
          )}
          {onEdit && (
            <button
              type="button"
              onClick={() => onEdit(answer)}
              className="inline-flex h-9 items-center gap-1.5 rounded-r-sm px-3 text-body-s font-semibold text-accent hover:bg-accent-soft"
            >
              <Pencil aria-hidden className="size-4" /> Edit
            </button>
          )}
          {onFeedback && (
            <span className="ml-auto flex items-center gap-1 text-caption text-muted">
              {rated === null ? (
                <>
                  Was this right?
                  <button
                    type="button"
                    aria-label="Yes, this was right"
                    onClick={() => {
                      setRated(true);
                      onFeedback(answer, true);
                    }}
                    className="flex size-9 items-center justify-center rounded-r-sm hover:bg-sunken"
                  >
                    <ThumbsUp aria-hidden className="size-4" />
                  </button>
                  <button
                    type="button"
                    aria-label="No, this was wrong"
                    onClick={() => {
                      setRated(false);
                      onFeedback(answer, false);
                    }}
                    className="flex size-9 items-center justify-center rounded-r-sm hover:bg-sunken"
                  >
                    <ThumbsDown aria-hidden className="size-4" />
                  </button>
                </>
              ) : (
                "Thanks, noted."
              )}
            </span>
          )}
        </footer>
      )}
    </article>
  );
}
