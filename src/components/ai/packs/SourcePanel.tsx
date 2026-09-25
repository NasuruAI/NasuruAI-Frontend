"use client";

import { Briefcase } from "lucide-react";
import Link from "next/link";
import type { CitedFact, Pack, PackAnswer } from "@/lib/ai/packs";
import { allAnswers } from "@/lib/ai/packs";
import { cx } from "../cx";
import { factView } from "../onboarding/facts";

type Use = { answer: string; sentence: number };

/** Where each fact is used across the pack: "Why Zalando? sentence 2". */
export function factUses(pack: Pick<Pack, "sections">): Map<string, Use[]> {
  const uses = new Map<string, Use[]>();
  for (const answer of allAnswers(pack)) {
    answer.claims.forEach((claim, index) => {
      for (const source of claim.sources) {
        uses.set(source, [
          ...(uses.get(source) ?? []),
          { answer: answer.field.label, sentence: index + 1 },
        ]);
      }
    });
  }
  return uses;
}

/**
 * The context panel beside an answer (web.md §8.1, H3): the facts it rests
 * on, and for a chosen sentence, the ones that sentence cites.
 */
export function SourcePanel({
  pack,
  answer,
  sentence,
}: {
  pack: Pack;
  answer: PackAnswer | null;
  sentence: number | null;
}) {
  if (!answer) {
    return (
      <p className="text-body-s text-muted">
        Choose <span className="font-semibold text-ink">Where this came from</span> on an answer, or
        a sentence of a written one, to see the facts behind it.
      </p>
    );
  }
  const uses = factUses(pack);
  const claim = sentence !== null ? answer.claims[sentence] : undefined;
  const ids = new Set((answer.fact_ids as string[] | undefined) ?? []);
  const cited: CitedFact[] = pack.facts.filter((fact) => ids.has(fact.id));
  const highlighted = new Set(claim?.sources ?? []);
  const citesJob = claim
    ? highlighted.has("job")
    : answer.claims.some((c) => c.sources.includes("job"));

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold text-ink">{answer.field.label}</h3>
        {answer.source && <p className="text-body-s text-muted">{answer.source}</p>}
      </div>

      {claim && (
        <blockquote className="border-l-2 border-accent pl-3 text-body-s text-ink">
          <span className="sr-only">Sentence {sentence! + 1}: </span>“{claim.sentence}”
        </blockquote>
      )}

      {cited.length > 0 ? (
        <ul className="space-y-2" aria-label="Facts this answer rests on">
          {cited.map((fact) => {
            const view = factView(fact);
            const lit = highlighted.has(fact.id);
            return (
              <li
                key={fact.id}
                className={cx(
                  "rounded-r-sm border p-3",
                  lit ? "border-highlight-line bg-highlight" : "border-line bg-surface",
                )}
              >
                <p className="font-semibold text-ink">
                  {view.title}
                  {lit && <span className="sr-only"> (this sentence)</span>}
                </p>
                {view.subtitle && <p className="text-body-s text-muted">{view.subtitle}</p>}
                {view.detail && <p className="mt-1 text-body-s text-ink">“{view.detail}”</p>}
                {(uses.get(fact.id)?.length ?? 0) > 0 && (
                  <p className="mt-1 text-caption text-muted">
                    Used in:{" "}
                    {uses
                      .get(fact.id)!
                      .map((use) => `${use.answer}, sentence ${use.sentence}`)
                      .join("; ")}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        !citesJob && (
          <p className="text-body-s text-muted">
            {answer.kind === "you_answer"
              ? "Nothing is filled in for you here: this is yours to answer."
              : "This comes from your account details, not a profile fact."}
          </p>
        )
      )}

      {citesJob && (
        <p
          className={cx(
            "flex items-start gap-2 rounded-r-sm border p-3 text-body-s",
            claim ? "border-highlight-line bg-highlight" : "border-line",
          )}
        >
          <Briefcase aria-hidden className="mt-0.5 size-4 shrink-0 text-muted" />
          <span>
            {claim ? "This sentence is about" : "Some sentences are about"} the role, from{" "}
            <Link
              href={`/ai/jobs/${pack.job}`}
              className="text-accent underline underline-offset-3"
            >
              the job posting
            </Link>
            .
          </span>
        </p>
      )}

      <p className="text-caption text-muted">
        Something wrong?{" "}
        <Link href="/ai/start/facts" className="text-accent underline underline-offset-3">
          Fix it in your facts
        </Link>
        , then ask for the pack again: it&apos;s written from your profile as it is then.
      </p>
    </div>
  );
}
