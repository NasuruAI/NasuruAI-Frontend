"use client";

/**
 * Track (web.md §11.1–11.2, web-build F12): the application board, every
 * card moved only along the allowed stages, and a card's own timeline.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ai, unwrap } from "./client";
import type { components } from "./schema";

export type ApplicationState = components["schemas"]["ApplicationStateEnum"];
export type ApplicationKind = components["schemas"]["ApplicationKindEnum"];
export type VisaOutcome = components["schemas"]["VisaOutcomeEnum"];
export type TrackEvent = components["schemas"]["Event"];

export type NextState = { state: ApplicationState; label: string };
export type PendingSuggestion = {
  id: string;
  proposed_state: ApplicationState;
  proposed_state_label: string;
  summary: string;
};

/** `next_states` and `pending_suggestion` are hand-shaped: the schema can't
 * infer a SerializerMethodField's contents, only that it returns something. */
export type Card = Omit<components["schemas"]["Card"], "next_states"> & {
  next_states: NextState[];
  pending_suggestion: PendingSuggestion | null;
};
export type CardDetail = Omit<
  components["schemas"]["CardDetail"],
  "next_states" | "suggestions"
> & {
  next_states: NextState[];
  pending_suggestion: PendingSuggestion | null;
  suggestions: Suggestion[];
};

export type Suggestion = {
  id: string;
  proposed_state: ApplicationState;
  based_on_version: number;
  source: string;
  summary: string;
  status: "pending" | "accepted" | "dismissed";
  created_at: string;
};

export type Column = { state: ApplicationState; label: string; cards: Card[] };
export type Board = { columns: Column[] };

/** The 8 real stages, in order; rejected/withdrawn are terminal and shown apart. */
export const STAGES: ApplicationState[] = [
  "saved",
  "pack_ready",
  "applied",
  "interview",
  "offer",
  "visa_filed",
  "visa_decided",
  "arrived",
];

export const STATE_LABEL: Record<ApplicationState, string> = {
  saved: "Saved",
  pack_ready: "Answers ready",
  applied: "Applied",
  interview: "Interview",
  offer: "Offer",
  visa_filed: "Visa filed",
  visa_decided: "Visa decided",
  arrived: "Arrived",
  rejected: "Not successful",
  withdrawn: "Withdrawn",
};

export const trackKeys = {
  board: ["ai", "track", "board"] as const,
  card: (id: string) => ["ai", "track", "card", id] as const,
};

export function useBoard() {
  return useQuery({
    queryKey: trackKeys.board,
    queryFn: async () => (await unwrap(ai.GET("/api/ai/v1/me/applications/"))) as unknown as Board,
  });
}

export function useCard(id: string) {
  return useQuery({
    queryKey: trackKeys.card(id),
    queryFn: async () =>
      (await unwrap(
        ai.GET("/api/ai/v1/me/applications/{card_id}/", { params: { path: { card_id: id } } }),
      )) as unknown as CardDetail,
    enabled: Boolean(id),
  });
}

function patchBoard(
  client: ReturnType<typeof useQueryClient>,
  update: (card: Card) => Card,
  id: string,
) {
  client.setQueryData<Board>(trackKeys.board, (current) => {
    if (!current) return current;
    const columns = current.columns.map((column) => ({
      ...column,
      cards: column.cards.map((card) => (card.id === id ? update(card) : card)),
    }));
    return { columns };
  });
}

/**
 * Move a card to a new stage. Optimistic: the card jumps columns at once and
 * rolls back on refusal. A 409 means another device moved it first: reload.
 */
export function useMoveCard() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      card,
      to,
      note,
      visaOutcome,
    }: {
      card: Card;
      to: ApplicationState;
      note?: string;
      visaOutcome?: VisaOutcome;
    }) =>
      unwrap(
        ai.POST("/api/ai/v1/me/applications/{card_id}/move/", {
          params: { path: { card_id: card.id } },
          body: {
            to,
            version: card.version ?? 1,
            note: note ?? "",
            visa_outcome: visaOutcome ?? "",
          },
        }),
      ).then((data) => data as unknown as Card),
    onMutate: async ({ card, to }) => {
      await client.cancelQueries({ queryKey: trackKeys.board });
      const before = client.getQueryData<Board>(trackKeys.board);
      const moved = { ...card, state: to };
      client.setQueryData<Board>(trackKeys.board, (current) => {
        if (!current) return current;
        return {
          columns: current.columns.map((column) => ({
            ...column,
            cards:
              column.state === to
                ? [...column.cards.filter((c) => c.id !== card.id), moved]
                : column.cards.filter((c) => c.id !== card.id),
          })),
        };
      });
      return { before };
    },
    onError: (_error, _vars, context) => {
      if (context?.before) client.setQueryData(trackKeys.board, context.before);
    },
    onSuccess: (saved, { card }) => {
      void client.invalidateQueries({ queryKey: trackKeys.card(card.id) });
      client.setQueryData<Board>(trackKeys.board, (current) => {
        if (!current) return current;
        return {
          columns: current.columns.map((column) => ({
            ...column,
            cards:
              column.state === saved.state
                ? [...column.cards.filter((c) => c.id !== saved.id), saved]
                : column.cards.filter((c) => c.id !== saved.id),
          })),
        };
      });
    },
    onSettled: (_data, error) => {
      if (error) void client.invalidateQueries({ queryKey: trackKeys.board });
    },
  });
}

export function useEditNotes(cardId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ notes, version }: { notes: string; version: number }) =>
      unwrap(
        ai.PATCH("/api/ai/v1/me/applications/{card_id}/", {
          params: { path: { card_id: cardId } },
          body: { notes, version },
        }),
      ).then((data) => data as unknown as Card),
    onSuccess: (saved) => {
      client.setQueryData<CardDetail>(
        trackKeys.card(cardId),
        (current) => current && { ...current, ...saved },
      );
      patchBoard(client, (c) => ({ ...c, notes: saved.notes, version: saved.version }), cardId);
    },
  });
}

export function useArchiveCard() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (cardId: string) =>
      unwrap(
        ai.DELETE("/api/ai/v1/me/applications/{card_id}/", {
          params: { path: { card_id: cardId } },
        }),
      ),
    onSuccess: (_data, cardId) => {
      client.setQueryData<Board>(trackKeys.board, (current) => {
        if (!current) return current;
        return {
          columns: current.columns.map((column) => ({
            ...column,
            cards: column.cards.filter((c) => c.id !== cardId),
          })),
        };
      });
    },
  });
}

export function useSuggestionDecision(cardId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      suggestionId,
      decision,
    }: {
      suggestionId: string;
      decision: "accept" | "dismiss";
    }) =>
      unwrap(
        ai.POST("/api/ai/v1/me/applications/{card_id}/suggestions/{suggestion_id}/{decision}/", {
          params: { path: { card_id: cardId, suggestion_id: suggestionId, decision } },
        }),
      ),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: trackKeys.card(cardId) });
      void client.invalidateQueries({ queryKey: trackKeys.board });
    },
  });
}
