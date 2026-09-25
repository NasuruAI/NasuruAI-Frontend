"use client";

/**
 * The Plan (web.md §5, web-build F6): the chosen pathway, its to-dos,
 * deadlines from tracked applications, alerts and the family share link.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CostKind, CostLine } from "@/components/ai/evidence/Money";
import { ai, unwrap } from "./client";
import type { CostItem, Pathway } from "./onboarding";
import type { components } from "./schema";

export type { CostItem };

export type Todo = components["schemas"]["Todo"];
export type BoardCard = components["schemas"]["Card"];
export type RuleChange = components["schemas"]["EligibilityChange"];

export type PlanResponse = {
  plan: {
    codes: string[];
    chosen_at: string;
    pathway: Pathway | null;
    /** The chosen routes no longer form an open pathway: re-plan. */
    needs_replanning: boolean;
  } | null;
  todos: Todo[];
  share: { token: string; created_at: string; views: number } | null;
};

export type ExpiryWarning = {
  document_id: string;
  kind: string;
  expires_on: string;
  days_left: number;
  expired: boolean;
  message: string;
};

export const planKeys = {
  plan: ["ai", "plan"] as const,
  allPathways: ["ai", "pathways", "all"] as const,
  board: ["ai", "board"] as const,
  expiring: ["ai", "documents", "expiring"] as const,
};

export function usePlan() {
  return useQuery({
    queryKey: planKeys.plan,
    queryFn: async () => (await unwrap(ai.GET("/api/ai/v1/me/plan/"))) as unknown as PlanResponse,
  });
}

/**
 * Tick or untick a to-do. Optimistic: the box changes at once and rolls back
 * if the server refuses. A 409 means another device changed it: reload.
 */
export function useSetTodo() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ todo, done }: { todo: Todo; done: boolean }) =>
      unwrap(
        ai.PATCH("/api/ai/v1/me/plan/todos/{todo_id}/", {
          params: { path: { todo_id: todo.id } },
          body: { version: todo.version ?? 1, done },
        }),
      ),
    onMutate: async ({ todo, done }) => {
      await client.cancelQueries({ queryKey: planKeys.plan });
      const before = client.getQueryData<PlanResponse>(planKeys.plan);
      client.setQueryData<PlanResponse>(
        planKeys.plan,
        (current) =>
          current && {
            ...current,
            todos: current.todos.map((item) =>
              item.id === todo.id
                ? {
                    ...item,
                    status: done ? "done" : "open",
                    done_at: done ? new Date().toISOString() : null,
                  }
                : item,
            ),
          },
      );
      return { before };
    },
    onError: (_error, _vars, context) => {
      if (context?.before) client.setQueryData(planKeys.plan, context.before);
    },
    onSuccess: (saved) => {
      client.setQueryData<PlanResponse>(
        planKeys.plan,
        (current) =>
          current && {
            ...current,
            todos: current.todos.map((item) => (item.id === saved.id ? saved : item)),
          },
      );
    },
    onSettled: (_data, error) => {
      if (error) void client.invalidateQueries({ queryKey: planKeys.plan });
    },
  });
}

export function useAllPathways() {
  return useQuery({
    queryKey: planKeys.allPathways,
    queryFn: async () => {
      const body = (await unwrap(
        ai.GET("/api/ai/v1/me/plan/pathways/", { params: { query: { all: true } } }),
      )) as { pathways: Pathway[] };
      return body.pathways;
    },
  });
}

export function useChoosePlan() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (codes: string[]) =>
      unwrap(
        ai.POST("/api/ai/v1/me/plan/", {
          body: { codes },
          headers: { "Idempotency-Key": crypto.randomUUID() },
        }),
      ),
    onSuccess: () => void client.invalidateQueries({ queryKey: planKeys.plan }),
  });
}

/** Create a family link (revoking any old one) or stop sharing. */
export function useShareLink() {
  const client = useQueryClient();
  const refresh = () => void client.invalidateQueries({ queryKey: planKeys.plan });
  const create = useMutation({
    mutationFn: () => unwrap(ai.POST("/api/ai/v1/me/plan/share/")),
    onSuccess: refresh,
  });
  const revoke = useMutation({
    mutationFn: () => unwrap(ai.DELETE("/api/ai/v1/me/plan/share/")),
    onSuccess: refresh,
  });
  return { create, revoke };
}

export function useBoard() {
  return useQuery({
    queryKey: planKeys.board,
    queryFn: async () =>
      (await unwrap(ai.GET("/api/ai/v1/me/applications/"))) as unknown as {
        columns: { state: string; label: string; cards: BoardCard[] }[];
      },
  });
}

export function useExpiring() {
  return useQuery({
    queryKey: planKeys.expiring,
    queryFn: async () =>
      (
        (await unwrap(ai.GET("/api/ai/v1/me/documents/expiring/"))) as unknown as {
          warnings: ExpiryWarning[];
        }
      ).warnings,
  });
}

/** States where a deadline still matters: not yet applied. */
const BEFORE_APPLYING = new Set(["saved", "pack_ready"]);

/** Tracked applications with a deadline still ahead, soonest first. */
export function upcomingDeadlines(
  columns: { cards: BoardCard[] }[],
  now: Date = new Date(),
  limit = 5,
): BoardCard[] {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return columns
    .flatMap((column) => column.cards)
    .filter(
      (card) =>
        card.deadline &&
        BEFORE_APPLYING.has(card.state ?? "") &&
        new Date(`${card.deadline}T00:00:00`).getTime() >= today,
    )
    .sort((a, b) => a.deadline.localeCompare(b.deadline))
    .slice(0, limit);
}

/** "Jul 2027": the month someone arrives if they start now. */
export function arrivalMonth(months: number, now: Date = new Date()): string {
  return new Date(now.getFullYear(), now.getMonth() + months, 1).toLocaleDateString("en-GB", {
    month: "short",
    year: "numeric",
  });
}

const COST_KIND: Record<string, CostKind> = {
  tuition: "tuition",
  living: "living",
  visa_fee: "visa",
  health: "visa",
  test: "tests",
  credentials: "tests",
  travel: "travel",
  proof_of_funds: "proof_of_funds",
  other: "other",
};

/** A pathway's cost items as CostBreakdown lines; unconverted items are left out. */
export function costLines(items: CostItem[] = []): CostLine[] {
  return items
    .filter((item) => item.ngn !== null)
    .map((item) => ({
      kind: COST_KIND[item.category] ?? "other",
      label: item.label,
      naira: Number(item.ngn),
      foreign:
        item.currency !== "NGN"
          ? { amount: Number(item.amount), currency: item.currency }
          : undefined,
      source: item.source_name
        ? {
            name: item.source_name,
            url: item.source_url,
            checkedOn: item.verified_at,
            recheckAfter: item.recheck_after,
            stale: item.is_stale,
          }
        : undefined,
    }));
}
