"use client";

/**
 * Routes (web.md §6, web-build F7): your eligibility per route, a route's
 * rules with how each was worked out, its checklist and grounded Q&A, the
 * seven-country comparison and the points calculators.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ai, unwrap } from "./client";
import type { EligibilityResult } from "./onboarding";
import { planKeys } from "./plan";
import type { components } from "./schema";

export {
  CALCULATOR_KINDS,
  CALCULATORS,
  type CalculatorKind,
  calculatorFor,
  isCalculatorKind,
} from "./calculators";

type Schemas = components["schemas"];
export type EligibilityDetail = Schemas["EligibilityDetail"];
export type RouteDetail = Schemas["RouteDetail"];
export type PointsResult = Schemas["PointsResult"];
export type GuideAnswer = Schemas["GuideAnswer"];

/** Where a rule, a gate or a trace line comes from (apps.rules.engine._provenance). */
export type Provenance = {
  source_name: string;
  source_url: string;
  verified_at: string;
  is_stale: boolean;
};

/** One line of "How we worked this out": a rule, what it read, and the outcome. */
export type TraceRule = Provenance & {
  key: string;
  group: string;
  description: string;
  outcome: "pass" | "fail" | "unknown";
  inputs: Record<string, unknown>;
  value: unknown;
  unit: string;
  version_id: string;
};

/** A nationality gate that applied to you. */
export type TraceGate = Provenance & { gate: string; effect: string; note: string };

export type TraceLine = TraceRule | TraceGate;

export function isGate(line: TraceLine): line is TraceGate {
  return "gate" in line;
}

export type PublicRule = Provenance & {
  key: string;
  group: string;
  description: string;
  value: unknown;
  unit: string;
  closable: boolean;
  effective_from: string;
};

export type ChecklistItem = {
  key: string;
  title: string;
  detail: string;
  status: "done" | "todo";
  why: string;
  source_url: string;
  stale: boolean;
};

export type Checklist = {
  route: string;
  name: string;
  done: number;
  total: number;
  items: ChecklistItem[];
};

export type Citation = {
  source_id?: string;
  name: string;
  url: string;
  quote: string;
  page_changed?: boolean;
};

export const routeKeys = {
  detail: (code: string) => ["ai", "eligibility", code] as const,
  route: (code: string) => ["routes", code] as const,
  checklist: (code: string) => ["ai", "checklist", code] as const,
  answer: (id: string) => ["ai", "guide", id] as const,
  points: (scheme: string) => ["ai", "points", scheme] as const,
};

/** Your result for one route, with the trace. 404 when the route isn't computed for you. */
export function useEligibilityDetail(code: string) {
  return useQuery({
    queryKey: routeKeys.detail(code),
    queryFn: () =>
      unwrap(
        ai.GET("/api/ai/v1/me/eligibility/{route_code}/", {
          params: { path: { route_code: code } },
        }),
      ),
    retry: false,
  });
}

/** The route's requirements in force today, each with its source. Public. */
export function useRouteDetail(code: string) {
  return useQuery({
    queryKey: routeKeys.route(code),
    queryFn: () =>
      unwrap(ai.GET("/api/ai/v1/routes/{route_code}/", { params: { path: { route_code: code } } })),
    retry: false,
  });
}

export function useChecklist(code: string, enabled = true) {
  return useQuery({
    queryKey: routeKeys.checklist(code),
    queryFn: async () =>
      (await unwrap(
        ai.GET("/api/ai/v1/me/checklists/{route_code}/", {
          params: { path: { route_code: code } },
        }),
      )) as unknown as Checklist,
    enabled,
  });
}

/**
 * Ask about a route. The API answers from the route's official pages only;
 * a fresh question comes back `answering` and is polled until it settles.
 */
export function useAsk() {
  return useMutation({
    mutationFn: (input: { route: string; question: string }) =>
      unwrap(
        ai.POST("/api/ai/v1/guide/ask/", {
          body: input,
          headers: { "Idempotency-Key": crypto.randomUUID() },
        }),
      ),
  });
}

export function useAnswer(id: string | null) {
  return useQuery({
    queryKey: routeKeys.answer(id ?? ""),
    queryFn: () =>
      unwrap(
        ai.GET("/api/ai/v1/guide/answers/{answer_id}/", { params: { path: { answer_id: id! } } }),
      ),
    enabled: Boolean(id),
    refetchInterval: (query) => (query.state.data?.status === "answering" ? 2000 : false),
  });
}

/** Add a to-do yourself: a gap, or a points improvement. Adding twice adds it once. */
export function useAddTodo() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: { key: string; title: string; detail?: string; route?: string }) =>
      unwrap(
        ai.POST("/api/ai/v1/me/plan/todos/", {
          body: { detail: "", route: "", ...input },
          headers: { "Idempotency-Key": crypto.randomUUID() },
        }),
      ),
    onSuccess: () => void client.invalidateQueries({ queryKey: planKeys.plan }),
  });
}

/** A to-do key from free text: "Reach CLB 7 in French" -> "reach-clb-7-in-french". */
export function slugKey(text: string): string {
  return (
    text
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "item"
  );
}

// --- Points calculators ----------------------------------------------------------

/** Your score from your confirmed profile. */
export function usePoints(scheme: string) {
  return useQuery({
    queryKey: routeKeys.points(scheme),
    queryFn: () =>
      unwrap(ai.GET("/api/ai/v1/me/points/{scheme}/", { params: { path: { scheme } } })),
    retry: false,
  });
}

/** The score with some what-ifs applied. Never saves anything. */
export function useWhatIf(scheme: string, overrides: Record<string, unknown> | null) {
  return useQuery({
    queryKey: [...routeKeys.points(scheme), "what-if", overrides] as const,
    queryFn: () =>
      unwrap(
        ai.POST("/api/ai/v1/me/points/{scheme}/", {
          params: { path: { scheme } },
          body: { overrides: overrides ?? {} },
        }),
      ),
    enabled: overrides !== null && Object.keys(overrides).length > 0,
    placeholderData: (previous) => previous,
  });
}

// --- "What would change my results?" --------------------------------------------

export type Unlock = { key: string; text: string; routes: { code: string; name: string }[] };

/**
 * The gaps that stand between you and the most routes. Routes share a gap
 * when their rules share a group key (the same English test, say).
 * Researcher-side gaps (stale rules, rules still being written) are left out.
 */
export function topUnlocks(results: EligibilityResult[], limit = 3): Unlock[] {
  const byKey = new Map<string, Unlock>();
  for (const result of results) {
    if (result.status === "blocked" || result.status === "eligible") continue;
    for (const gap of result.gaps) {
      if (gap.key === "stale" || gap.key === "rules_pending") continue;
      const entry = byKey.get(gap.key) ?? { key: gap.key, text: gap.text, routes: [] };
      entry.routes.push({ code: result.route.code, name: result.route.name });
      byKey.set(gap.key, entry);
    }
  }
  return [...byKey.values()]
    .sort((a, b) => b.routes.length - a.routes.length || a.text.localeCompare(b.text))
    .slice(0, limit);
}

/** The newest computed_at: "checked against rules as of …". */
export function checkedAt(results: EligibilityResult[]): string | null {
  return results.reduce<string | null>(
    (latest, result) => (!latest || result.computed_at > latest ? result.computed_at : latest),
    null,
  );
}

/** Your results for any of the seven countries: comparing never switches. */
export function useEligibilityFor(country: string | null) {
  return useQuery({
    queryKey: ["ai", "eligibility", "country", country] as const,
    queryFn: () =>
      unwrap(ai.GET("/api/ai/v1/me/eligibility/", { params: { query: { country: country! } } })),
    enabled: Boolean(country),
  });
}

/** What each route costs on its own, from the single-route pathways, keyed by route code. */
export function routeCosts(
  pathways: { codes: string[]; cost: { spend_ngn?: string; complete?: boolean } }[] = [],
): Record<string, number> {
  const costs: Record<string, number> = {};
  for (const pathway of pathways) {
    const spend = Number(pathway.cost.spend_ngn ?? 0);
    if (pathway.codes.length === 1 && spend > 0) costs[pathway.codes[0]] = spend;
  }
  return costs;
}
