"use client";

/**
 * The application board (web.md §11.1, web-build F12): 8 stages, cards moved
 * only to an allowed next stage, dashed suggestion ghost cards from the
 * inbox connection. Board (drag or "Move to") and list views for the same
 * data — list is the accessible default on small screens.
 */

import { Check, KanbanSquare, List, Mail, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useAnnouncer } from "@/components/ui/Announcer";
import {
  type ApplicationState,
  type Card,
  STAGES,
  STATE_LABEL,
  useBoard,
  useMoveCard,
  useSuggestionDecision,
} from "@/lib/ai/track";
import { Button } from "../Button";
import { Pill, type Tone } from "../Chip";
import { SegmentedControl } from "../choice";
import { cx } from "../cx";
import { CountdownChip } from "../evidence/Status";
import { EmptyState, Skeleton } from "../feedback";
import { Select } from "../Select";

const STAGE_TONE: Record<ApplicationState, Tone> = {
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

function typing(target: EventTarget | null): boolean {
  const element = target as HTMLElement | null;
  if (!element) return false;
  return element.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(element.tagName);
}

function nextAction(card: Card): string {
  switch (card.state) {
    case "saved":
      return "Prepare your answers";
    case "pack_ready":
      return "Apply before the deadline";
    case "applied":
      return "Wait to hear back";
    case "interview":
      return "Practise for the interview";
    case "offer":
      return "Start your visa";
    case "visa_filed":
      return "Wait for a decision";
    case "visa_decided":
      return card.visa_outcome === "refused" ? "See what went wrong" : "Plan your arrival";
    case "arrived":
      return "You made it";
    default:
      return "";
  }
}

function MoveSelect({ card, onMoved }: { card: Card; onMoved: (label: string) => void }) {
  const move = useMoveCard();
  const options = card.next_states.map((s) => ({ value: s.state, label: `Move to ${s.label}` }));
  if (!options.length) return null;
  return (
    <Select
      label={`Move ${card.title}`}
      hideLabel
      options={options}
      placeholder="Move to…"
      value=""
      disabled={move.isPending}
      onChange={(event) => {
        const to = event.target.value as ApplicationState;
        if (!to) return;
        const label = STATE_LABEL[to];
        move.mutate({ card, to }, { onSuccess: () => onMoved(label) });
        event.target.value = "";
      }}
      className="w-auto"
    />
  );
}

function BoardCard({
  card,
  draggable,
  onDragStart,
  onMoved,
  selected,
}: {
  card: Card;
  draggable: boolean;
  onDragStart: (card: Card) => void;
  onMoved: (label: string) => void;
  selected: boolean;
}) {
  return (
    <article
      draggable={draggable}
      onDragStart={() => onDragStart(card)}
      data-selected={selected || undefined}
      className={cx(
        "rounded-r-md border border-line bg-surface p-3 shadow-e1 data-selected:border-accent data-selected:ring-2 data-selected:ring-accent",
        draggable && "cursor-grab active:cursor-grabbing",
      )}
    >
      <Link href={`/ai/track/${card.id}`} className="block font-semibold text-ink hover:underline">
        {card.title}
      </Link>
      <p className="mt-0.5 text-body-s text-muted">{card.organisation}</p>
      <p className="mt-2 text-caption text-subtle">{nextAction(card)}</p>
      {card.deadline && (
        <div className="mt-2">
          <CountdownChip date={card.deadline} />
        </div>
      )}
      <div className="mt-3">
        <MoveSelect card={card} onMoved={onMoved} />
      </div>
    </article>
  );
}

function SuggestionGhost({
  cardId,
  suggestionId,
  label,
  summary,
}: {
  cardId: string;
  suggestionId: string;
  label: string;
  summary: string;
}) {
  const decide = useSuggestionDecision(cardId);
  const announce = useAnnouncer().announce;
  return (
    <article className="rounded-r-md border border-dashed border-info-line bg-info-bg/40 p-3">
      <p className="flex items-center gap-1.5 text-caption font-semibold text-info">
        <Mail aria-hidden className="size-3.5" /> Suggested: move to {label}
      </p>
      <p className="mt-1 text-body-s text-ink">{summary}</p>
      <div className="mt-2 flex gap-2">
        <Button
          size="sm"
          loading={decide.isPending && decide.variables?.decision === "accept"}
          onClick={() =>
            decide.mutate(
              { suggestionId, decision: "accept" },
              { onSuccess: () => announce(`Moved to ${label}`) },
            )
          }
        >
          <Check aria-hidden className="size-4" /> Accept
        </Button>
        <Button
          size="sm"
          variant="tertiary"
          loading={decide.isPending && decide.variables?.decision === "dismiss"}
          onClick={() =>
            decide.mutate(
              { suggestionId, decision: "dismiss" },
              { onSuccess: () => announce("Dismissed") },
            )
          }
        >
          <X aria-hidden className="size-4" /> Dismiss
        </Button>
      </div>
    </article>
  );
}

export function TrackBoard() {
  const board = useBoard();
  const move = useMoveCard();
  const { announce } = useAnnouncer();
  const [view, setView] = useState<"board" | "list">("board");
  const [dragging, setDragging] = useState<Card | null>(null);
  const [selected, setSelected] = useState(0);
  const [awaitingStage, setAwaitingStage] = useState(false);
  const liveRegion = useRef<HTMLDivElement>(null);

  const cards = board.data ? board.data.columns.flatMap((column) => column.cards) : [];

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey || typing(event.target)) return;
      if (!cards.length) return;
      if (awaitingStage) {
        const index = Number(event.key) - 1;
        if (!Number.isNaN(index) && index >= 0 && index < STAGES.length) {
          event.preventDefault();
          const card = cards[selected];
          const to = STAGES[index];
          const allowed = card.next_states.some((s) => s.state === to);
          setAwaitingStage(false);
          if (allowed) {
            move.mutate({ card, to }, { onSuccess: () => announce(`Moved to ${STATE_LABEL[to]}`) });
          } else {
            announce("That stage isn't allowed from here");
          }
        } else if (event.key === "Escape") {
          setAwaitingStage(false);
        }
        return;
      }
      if (event.key === "j" || event.key === "k") {
        event.preventDefault();
        setSelected((current) =>
          Math.max(0, Math.min(cards.length - 1, current + (event.key === "j" ? 1 : -1))),
        );
      } else if (event.key === "m") {
        event.preventDefault();
        setAwaitingStage(true);
        announce("Press a stage number to move this card, or Escape to cancel");
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (board.isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-48" />
        ))}
      </div>
    );
  }

  if (!cards.length) {
    return (
      <EmptyState icon={<KanbanSquare aria-hidden />} title="Nothing on your board yet">
        Save a job or track a study intake and it shows up here, moved along as you apply.
      </EmptyState>
    );
  }

  const columns = (board.data?.columns ?? []).filter(
    (column) => STAGES.includes(column.state) || column.cards.length > 0,
  );

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <SegmentedControl
          label="Board or list view"
          value={view}
          onChange={setView}
          options={[
            {
              value: "board",
              label: (
                <>
                  <span className="sr-only">Board view</span>
                  <KanbanSquare aria-hidden className="size-4" />
                </>
              ),
            },
            {
              value: "list",
              label: (
                <>
                  <span className="sr-only">List view</span>
                  <List aria-hidden className="size-4" />
                </>
              ),
            },
          ]}
        />
        <p className="hidden text-caption text-subtle sm:block">
          <kbd className="rounded border border-line px-1">j</kbd>/
          <kbd className="rounded border border-line px-1">k</kbd> to move between cards,{" "}
          <kbd className="rounded border border-line px-1">m</kbd> then a number to change stage
        </p>
      </div>
      <div aria-live="polite" className="sr-only" ref={liveRegion}>
        {awaitingStage &&
          `Choose a stage: ${STAGES.map((s, i) => `${i + 1} ${STATE_LABEL[s]}`).join(", ")}`}
      </div>

      {view === "list" ? (
        <ul className="mt-4 space-y-2">
          {cards.map((card, index) => (
            <li key={card.id}>
              <div
                data-selected={index === selected || undefined}
                className="flex flex-wrap items-center justify-between gap-3 rounded-r-md border border-line p-3 data-selected:border-accent data-selected:ring-2 data-selected:ring-accent"
              >
                <div className="min-w-0">
                  <Link
                    href={`/ai/track/${card.id}`}
                    className="font-semibold text-ink hover:underline"
                  >
                    {card.title}
                  </Link>
                  <p className="text-body-s text-muted">
                    {card.organisation} ·{" "}
                    <Pill tone={STAGE_TONE[card.state ?? "saved"]}>{card.state_label}</Pill>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {card.deadline && <CountdownChip date={card.deadline} />}
                  <MoveSelect card={card} onMoved={(label) => announce(`Moved to ${label}`)} />
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="relative mt-4 flex min-w-0 gap-4 overflow-x-auto pb-2">
          {columns.map((column) => {
            const validTarget = dragging
              ? dragging.next_states.some((s) => s.state === column.state)
              : true;
            return (
              <section
                key={column.state}
                aria-label={column.label}
                onDragOver={(event) => {
                  if (dragging && validTarget) event.preventDefault();
                }}
                onDrop={() => {
                  if (dragging && validTarget && dragging.state !== column.state) {
                    move.mutate(
                      { card: dragging, to: column.state },
                      { onSuccess: () => announce(`Moved to ${column.label}`) },
                    );
                  }
                  setDragging(null);
                }}
                className={cx(
                  "w-72 shrink-0 rounded-r-lg border border-line bg-sunken/50 p-3",
                  dragging && !validTarget && "opacity-40",
                )}
              >
                <h2 className="flex items-center justify-between text-body-s font-semibold text-ink">
                  {column.label}
                  <span className="text-caption text-subtle">{column.cards.length}</span>
                </h2>
                <div className="mt-3 space-y-3">
                  {column.cards.map((card) => (
                    <div key={card.id} className="space-y-2">
                      <BoardCard
                        card={card}
                        draggable
                        onDragStart={setDragging}
                        onMoved={(label) => announce(`Moved to ${label}`)}
                        selected={cards[selected]?.id === card.id}
                      />
                      {card.pending_suggestion && (
                        <SuggestionGhost
                          cardId={card.id}
                          suggestionId={card.pending_suggestion.id}
                          label={card.pending_suggestion.proposed_state_label}
                          summary={card.pending_suggestion.summary}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

export { MoveSelect, SuggestionGhost };
