"use client";

/**
 * Application detail (web.md §11.2, web-build F12): a card's own timeline,
 * notes, the next action, and the way through to the job or programme that
 * started it, where the pack and CV live.
 */

import { ArrowLeft, Mic } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useAnnouncer } from "@/components/ui/Announcer";
import { ApiError } from "@/lib/api";
import { STAGES, STATE_LABEL, useCard, useEditNotes } from "@/lib/ai/track";
import { Button, ButtonLink } from "../Button";
import { Pill, type Tone } from "../Chip";
import { daysBetween, formatDate, relativeDays } from "../evidence/format";
import { CountdownChip } from "../evidence/Status";
import { EmptyState, InlineAlert, Skeleton } from "../feedback";
import { TextArea } from "../fields";
import { MoveSelect, SuggestionGhost } from "./TrackBoard";

const STAGE_TONE: Record<string, Tone> = {
  saved: "neutral",
  pack_ready: "info",
  applied: "info",
  interview: "accent",
  offer: "success",
  visa_filed: "accent",
  visa_decided: "accent",
  arrived: "success",
  rejected: "danger",
  withdrawn: "neutral",
};

function eventLine(fromState: string | undefined, toState: string, actor: string): string {
  const to = STATE_LABEL[toState as (typeof STAGES)[number]] ?? toState;
  const by =
    actor === "candidate" ? "You" : actor === "suggestion" ? "Accepted a suggestion" : "Automatic";
  if (!fromState) return `${by} started this application`;
  const from = STATE_LABEL[fromState as (typeof STAGES)[number]] ?? fromState;
  return `${by} moved it from ${from} to ${to}`;
}

export function ApplicationDetailView({ applicationId }: { applicationId: string }) {
  const card = useCard(applicationId);
  const editNotes = useEditNotes(applicationId);
  const { announce } = useAnnouncer();
  const [notes, setNotes] = useState("");
  const [loadedNotes, setLoadedNotes] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Seed the editor from the server once per load: an "adjusting state when
  // a prop changes" pattern, not an effect, so a background refetch never
  // clobbers text the candidate is mid-typing.
  if (card.data && card.data.notes !== loadedNotes) {
    setLoadedNotes(card.data.notes ?? "");
    setNotes(card.data.notes ?? "");
  }

  if (card.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  if (card.isError || !card.data) {
    return (
      <EmptyState icon={<ArrowLeft aria-hidden />} title="We couldn't find that application">
        It may have been removed from your board.
      </EmptyState>
    );
  }

  const data = card.data;
  const dirty = notes !== (data.notes ?? "");

  function saveNotes() {
    setError(null);
    editNotes.mutate(
      { notes, version: data?.version ?? 1 },
      {
        onSuccess: () => announce("Notes saved"),
        onError: (err) => {
          if (err instanceof ApiError && err.status === 409) {
            setError(
              "This application changed elsewhere. Reload to see the latest before saving notes.",
            );
          } else {
            setError("Couldn't save your notes. Try again.");
          }
        },
      },
    );
  }

  return (
    <div className="space-y-6">
      <Link
        href="/ai/track"
        className="inline-flex items-center gap-1.5 text-body-s text-muted hover:text-ink"
      >
        <ArrowLeft aria-hidden className="size-4" /> Your applications
      </Link>

      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="font-display text-h2 text-ink">{data.title}</h1>
          <Pill tone={STAGE_TONE[data.state ?? "saved"]}>{data.state_label}</Pill>
        </div>
        <p className="mt-1 text-body text-muted">
          {data.organisation}
          {data.country && ` · ${data.country}`}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          {data.deadline && <CountdownChip date={data.deadline} label="Deadline" />}
          <MoveSelect card={data} onMoved={(label) => announce(`Moved to ${label}`)} />
          {data.job && <ButtonLink href={`/ai/jobs/${data.job}`}>Open the job</ButtonLink>}
          {data.programme && (
            <ButtonLink href={`/ai/study/${data.programme}`}>Open the programme</ButtonLink>
          )}
          {(data.state === "interview" || data.state === "applied") && (
            <ButtonLink
              variant="secondary"
              href={`/ai/interview${data.job ? `?job=${data.job}` : ""}`}
              icon={<Mic aria-hidden className="size-4" />}
            >
              Prepare for interview
            </ButtonLink>
          )}
        </div>
      </div>

      {data.pending_suggestion && (
        <SuggestionGhost
          cardId={applicationId}
          suggestionId={data.pending_suggestion.id}
          label={data.pending_suggestion.proposed_state_label}
          summary={data.pending_suggestion.summary}
        />
      )}

      <section>
        <h2 className="text-h4 text-ink">Timeline</h2>
        {data.events.length === 0 ? (
          <p className="mt-2 text-body-s text-muted">No moves recorded yet.</p>
        ) : (
          <ol className="mt-3 space-y-3">
            {[...data.events].reverse().map((event, index) => (
              <li key={`${event.created_at}-${index}`} className="flex gap-3">
                <span aria-hidden className="mt-1.5 size-2 shrink-0 rounded-full bg-accent" />
                <div>
                  <p className="text-body text-ink">
                    {eventLine(event.from_state || undefined, event.to_state, event.actor)}
                  </p>
                  {event.note && (
                    <p className="text-body-s text-muted">&ldquo;{event.note}&rdquo;</p>
                  )}
                  <p className="text-caption text-subtle">
                    {formatDate(event.created_at)} · {relativeDays(daysBetween(event.created_at))}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section>
        <h2 className="text-h4 text-ink">Notes</h2>
        <p className="mt-1 text-body-s text-muted">Only you see these.</p>
        <TextArea
          label="Notes"
          hideLabel
          className="mt-2"
          rows={5}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          maxLength={10000}
        />
        {error && (
          <InlineAlert tone="danger" title="Couldn't save">
            {error}
          </InlineAlert>
        )}
        <div className="mt-2 flex items-center gap-3">
          <Button
            onClick={saveNotes}
            disabled={!dirty || editNotes.isPending}
            loading={editNotes.isPending}
          >
            Save notes
          </Button>
          {dirty && <span className="text-caption text-subtle">Unsaved changes</span>}
        </div>
      </section>
    </div>
  );
}
