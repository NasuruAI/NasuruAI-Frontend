"use client";

/**
 * A route's own checklist and grounded Q&A (web.md §6.2 "Checklist"/"Guide"
 * tabs, §11.5 visa guide): shared between the route detail page (F7) and the
 * visa guide page (F12), which show the exact same two things.
 */

import { CircleCheck, CircleDashed, ExternalLink, FileCheck2, Quote } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { ApiError } from "@/lib/api";
import { type Citation, useAnswer, useAsk, useChecklist } from "@/lib/ai/routes";
import { Button } from "../Button";
import { cx } from "../cx";
import { SourceLine } from "../evidence/Source";
import { InlineAlert, ProgressBar, Skeleton } from "../feedback";
import { TextArea } from "../fields";

export function ChecklistPanel({ code }: { code: string }) {
  const checklist = useChecklist(code);
  if (checklist.isPending) return <Skeleton className="h-40 w-full" />;
  if (checklist.isError)
    return <InlineAlert tone="danger" title="We couldn't load the checklist." />;
  const { items, done, total } = checklist.data;
  if (!items.length) {
    return (
      <p className="text-body text-muted">
        Our researchers haven&apos;t written this route&apos;s checklist yet.
      </p>
    );
  }
  return (
    <div className="space-y-4">
      <ProgressBar value={done} max={total} label={`${done} of ${total} ready`} />
      <ul className="divide-y divide-line rounded-r-md border border-line">
        {items.map((item) => (
          <li key={item.key} className="flex gap-3 p-4">
            {item.status === "done" ? (
              <CircleCheck aria-hidden className="mt-0.5 size-5 shrink-0 text-success" />
            ) : (
              <CircleDashed aria-hidden className="mt-0.5 size-5 shrink-0 text-muted" />
            )}
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-ink">
                {item.title}
                <span className="sr-only">{item.status === "done" ? " (ready)" : " (to do)"}</span>
              </p>
              {item.detail && <p className="text-body-s text-muted">{item.detail}</p>}
              {item.why && (
                <p
                  className={cx(
                    "mt-1 text-body-s",
                    item.status === "done" ? "text-success" : "text-ink",
                  )}
                >
                  {item.why}
                </p>
              )}
              <SourceLine
                className="mt-1"
                source={{ name: "Official page", url: item.source_url, stale: item.stale }}
              />
            </div>
          </li>
        ))}
      </ul>
      <Link
        href="/ai/documents"
        className="inline-flex items-center gap-1.5 text-body-s font-semibold text-accent hover:underline"
      >
        <FileCheck2 aria-hidden className="size-4" /> Your documents
      </Link>
    </div>
  );
}

export function GuideQA({ code, summary }: { code: string; summary?: string }) {
  const ask = useAsk();
  const [question, setQuestion] = useState("");
  const [answerId, setAnswerId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const answer = useAnswer(answerId);
  const data = answer.data ?? ask.data;
  const disclaimer = (data as { disclaimer?: string } | undefined)?.disclaimer;
  const citations = (Array.isArray(data?.citations) ? data.citations : []) as Citation[];

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (question.trim().length < 8) {
      setError("Ask a full question, e.g. “Can my spouse work on this visa?”");
      return;
    }
    setError(null);
    ask.mutate(
      { route: code, question: question.trim() },
      {
        onSuccess: (result) => setAnswerId(result.id),
        onError: (err) =>
          setError(err instanceof ApiError ? err.message : "We couldn't send that. Try again."),
      },
    );
  }

  return (
    <div className="space-y-6">
      {summary && <p className="max-w-[70ch] text-body text-ink whitespace-pre-line">{summary}</p>}
      <form
        noValidate
        onSubmit={submit}
        className="space-y-3 rounded-r-md border border-line bg-surface p-5"
      >
        <h2 className="text-h3 text-ink">Ask about this route</h2>
        <p className="text-body-s text-muted">
          Answers come only from the official pages for this route, with the exact words they quote.
        </p>
        <TextArea
          label="Your question"
          rows={2}
          maxLength={500}
          value={question}
          error={error ?? undefined}
          onChange={(event) => setQuestion(event.target.value)}
        />
        <Button type="submit" loading={ask.isPending}>
          Ask
        </Button>
      </form>
      {data && (
        <section
          aria-live="polite"
          aria-labelledby="answer-heading"
          className="rounded-r-md border border-line p-5"
        >
          <h3 id="answer-heading" className="text-h4 text-ink">
            {data.question}
          </h3>
          {data.status === "answering" ? (
            <p className="mt-2 text-body text-muted">Reading the official pages…</p>
          ) : data.status === "not_in_sources" ? (
            <p className="mt-2 text-body text-ink">
              The official pages for this route don&apos;t answer that. Check with the embassy or a
              regulated adviser before you rely on anything else you read.
            </p>
          ) : data.status === "failed" ? (
            <InlineAlert
              tone="danger"
              title="We couldn't answer that just now. Try again in a minute."
            />
          ) : (
            <>
              <p className="mt-2 text-body text-ink whitespace-pre-line">{data.answer}</p>
              {data.partial && (
                <p className="mt-2 text-body-s text-warning">
                  Part of the answer couldn&apos;t be checked against the pages, so it was left out.
                </p>
              )}
              {citations.length > 0 && (
                <ul className="mt-4 space-y-3">
                  {citations.map((citation, index) => (
                    <li key={`${citation.url}-${index}`} className="rounded-r-sm bg-sunken p-3">
                      <blockquote className="flex gap-2 text-body-s text-ink">
                        <Quote aria-hidden className="mt-0.5 size-4 shrink-0 text-subtle" />
                        {citation.quote}
                      </blockquote>
                      <a
                        href={citation.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 inline-flex items-center gap-1 text-caption text-accent underline underline-offset-3"
                      >
                        {citation.name}
                        <ExternalLink aria-hidden className="size-3" />
                        <span className="sr-only"> (opens in a new tab)</span>
                      </a>
                      {citation.page_changed && (
                        <span className="ml-2 text-caption text-warning">
                          The page has changed since.
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
          {disclaimer && <p className="mt-4 text-caption text-subtle">{disclaimer}</p>}
        </section>
      )}
    </div>
  );
}
