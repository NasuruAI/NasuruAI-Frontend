"use client";

import { FileSearch, Plus, Quote } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ApiError } from "@/lib/api";
import {
  isReading,
  markFactsViewed,
  type ProfileFact,
  stepHref,
  useConfirmViewed,
  useDocuments,
  useFactAction,
  useFacts,
} from "@/lib/ai/onboarding";
import { Button, ButtonLink } from "../Button";
import { EmptyState, InlineAlert, ProgressBar, Skeleton } from "../feedback";
import { FactCard } from "../evidence/cards";
import { TaskProgress } from "../evidence/Progress";
import { factView, FactEditor, KIND_LABEL } from "./facts";
import { StepActions, StepIntro } from "./OnboardingFrame";

const ORDER = ["work", "education", "certification", "test_score", "language", "skill"];

type Source = { document?: string; page?: number | null; excerpt?: string };

function sourceOf(fact: ProfileFact): Source | null {
  const document = fact.source_document as { original_filename?: string } | null;
  if (!document && !fact.source_excerpt) return null;
  return {
    document: document?.original_filename,
    page: fact.source_page,
    excerpt: fact.source_excerpt || undefined,
  };
}

/** The page the fact was read from: an excerpt with where it came from. */
function SourcePreview({ source }: { source: Source }) {
  return (
    <figure className="rounded-r-md border border-line bg-sunken p-4">
      <figcaption className="flex items-center gap-2 text-caption text-muted">
        <FileSearch aria-hidden className="size-4" />
        {source.document ?? "Your document"}
        {source.page ? `, page ${source.page}` : ""}
      </figcaption>
      {source.excerpt ? (
        <blockquote className="mt-3 flex gap-2 text-body text-ink">
          <Quote aria-hidden className="mt-1 size-4 shrink-0 text-subtle" />
          <span className="rounded-r-sm border border-highlight-line bg-highlight px-1">
            {source.excerpt}
          </span>
        </blockquote>
      ) : (
        <p className="mt-3 text-body-s text-muted">No excerpt was saved for this one.</p>
      )}
    </figure>
  );
}

/**
 * Marks cards as viewed once half of each has been on screen: "Confirm
 * remaining" only confirms what the candidate has actually seen (D2).
 */
function useViewTracking(facts: ProfileFact[]) {
  const [seen, setSeen] = useState<Set<string>>(() => new Set());
  const pending = useRef(new Set<string>());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const observer = useRef<IntersectionObserver | null>(null);

  const flush = useRef(() => {
    const ids = [...pending.current];
    pending.current.clear();
    if (ids.length) void markFactsViewed(ids).catch(() => undefined);
  });

  // Created on first use: ref callbacks run before effects, so an observer
  // made in an effect would miss the cards of the first render.
  const getObserver = () =>
    (observer.current ??= new IntersectionObserver(
      (entries) => {
        const fresh = entries
          .filter((entry) => entry.isIntersecting)
          .map((entry) => (entry.target as HTMLElement).dataset.factId ?? "")
          .filter(Boolean);
        if (!fresh.length) return;
        fresh.forEach((id) => pending.current.add(id));
        setSeen((current) => new Set([...current, ...fresh]));
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(flush.current, 800);
      },
      { threshold: 0.5 },
    ));

  useEffect(() => {
    const send = flush.current;
    return () => {
      observer.current?.disconnect();
      observer.current = null;
      if (timer.current) clearTimeout(timer.current);
      send();
    };
  }, []);

  const ref = (element: HTMLElement | null) => {
    if (element && typeof IntersectionObserver !== "undefined") getObserver().observe(element);
  };
  const viewed = (fact: ProfileFact) => Boolean(fact.viewed_at) || seen.has(fact.id);
  return { ref, viewed, allViewed: facts.every(viewed) };
}

export function FactsStep() {
  const documents = useDocuments();
  const reading = (documents.data ?? []).some(isReading);
  const facts = useFacts({ poll: reading });
  const act = useFactAction();
  const confirmViewed = useConfirmViewed();
  const [selected, setSelected] = useState<string | null>(null);
  const [editing, setEditing] = useState<ProfileFact | "new" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const list = [...(facts.data ?? [])].sort(
    (a, b) => ORDER.indexOf(a.kind) - ORDER.indexOf(b.kind),
  );
  const unconfirmed = list.filter((fact) => fact.status === "unconfirmed");
  const confirmedCount = list.length - unconfirmed.length;
  const tracking = useViewTracking(unconfirmed);
  const current = list.find((fact) => fact.id === selected) ?? null;
  const currentSource = current ? sourceOf(current) : null;

  const onError = (err: Error) => {
    setError(
      err instanceof ApiError && err.status === 409
        ? "That changed on another device. We've loaded the latest version."
        : err instanceof ApiError
          ? err.message
          : "That didn't save. Check your connection and try again.",
    );
  };

  function confirmRemaining() {
    setError(null);
    confirmViewed.mutate(undefined, { onError });
  }

  return (
    <>
      <StepIntro
        title="Check what we found"
        lead="Confirm each detail, or fix it. Unconfirmed details are never used: not in your results, not in any form."
      />
      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-8">
        <div className="min-w-0">
          {list.length > 0 && (
            <div className="mb-5 space-y-3">
              <ProgressBar
                value={confirmedCount}
                max={list.length}
                label={`${confirmedCount} of ${list.length} confirmed`}
              />
            </div>
          )}
          {error && <InlineAlert tone="danger" title={error} className="mb-4" />}
          {facts.isPending ? (
            <div className="space-y-3">
              <Skeleton className="h-36 w-full" />
              <Skeleton className="h-36 w-full" />
            </div>
          ) : list.length === 0 && reading ? (
            <TaskProgress
              title="Reading your CV"
              steps={[
                { label: "Uploaded", state: "done" },
                { label: "Reading your work and education", state: "active" },
                { label: "Ready for you to check", state: "pending" },
              ]}
            />
          ) : list.length === 0 ? (
            <EmptyState
              icon={<FileSearch />}
              title="Nothing to check yet"
              action={
                <Button
                  icon={<Plus aria-hidden className="size-4" />}
                  onClick={() => setEditing("new")}
                >
                  Add your work and education
                </Button>
              }
            >
              We didn&apos;t find details to confirm. Add your work and education so the rules can
              see them.
            </EmptyState>
          ) : (
            <>
              <h2 className="sr-only">Your details</h2>
              <ul className="space-y-3">
                {list.map((fact) => {
                  const view = factView(fact);
                  const source = sourceOf(fact);
                  const shown = selected === fact.id;
                  return (
                    <li
                      key={fact.id}
                      ref={fact.status === "unconfirmed" ? tracking.ref : undefined}
                      data-fact-id={fact.id}
                    >
                      <FactCard
                        kindLabel={KIND_LABEL[fact.kind]}
                        title={view.title}
                        subtitle={view.subtitle}
                        detail={view.detail}
                        source={
                          source?.document
                            ? { document: source.document, page: source.page ?? undefined }
                            : undefined
                        }
                        confirmed={fact.status === "confirmed"}
                        onConfirm={() => act.mutate({ type: "confirm", fact }, { onError })}
                        onEdit={() => setEditing(fact)}
                        onDelete={() => act.mutate({ type: "reject", fact }, { onError })}
                        onSource={source ? () => setSelected(shown ? null : fact.id) : undefined}
                        sourceShown={shown}
                      >
                        {shown && source && (
                          <div className="mt-4 lg:hidden">
                            <SourcePreview source={source} />
                          </div>
                        )}
                      </FactCard>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
          {list.length > 0 && (
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Button
                variant="secondary"
                icon={<Plus aria-hidden className="size-4" />}
                onClick={() => setEditing("new")}
              >
                Add something we missed
              </Button>
              {unconfirmed.length > 0 && (
                <Button
                  onClick={confirmRemaining}
                  disabled={!tracking.allViewed}
                  loading={confirmViewed.isPending}
                >
                  Confirm remaining ({unconfirmed.length})
                </Button>
              )}
            </div>
          )}
          {unconfirmed.length > 0 && !tracking.allViewed && (
            <p className="mt-2 text-body-s text-muted">
              Scroll through every card first: we only confirm what you&apos;ve seen.
            </p>
          )}
          {reading && list.length > 0 && (
            <p role="status" className="mt-3 text-body-s text-muted">
              Still reading a document. New details will appear here.
            </p>
          )}
        </div>
        <aside aria-label="Source" className="hidden lg:block">
          <div className="sticky top-24">
            <h2 className="mb-3 text-h4 text-ink">Where it came from</h2>
            {currentSource ? (
              <SourcePreview source={currentSource} />
            ) : (
              <p className="rounded-r-md border border-dashed border-line p-4 text-body-s text-muted">
                Choose &ldquo;See source&rdquo; on a card to see the part of your document it was
                read from.
              </p>
            )}
          </div>
        </aside>
      </div>
      <StepActions back={stepHref("questions")}>
        {unconfirmed.length > 0 && (
          <span className="text-body-s text-muted">
            {unconfirmed.length} not confirmed: we won&apos;t use{" "}
            {unconfirmed.length === 1 ? "it" : "them"}.
          </span>
        )}
        <ButtonLink href={stepHref("occupation")} variant="primary" size="lg">
          Continue
        </ButtonLink>
      </StepActions>
      {editing && (
        <FactEditor
          key={editing === "new" ? "new" : editing.id}
          open
          onClose={() => setEditing(null)}
          fact={editing === "new" ? null : editing}
        />
      )}
    </>
  );
}
