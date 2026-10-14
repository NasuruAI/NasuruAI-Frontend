"use client";

/**
 * Parent/sponsor share view (web.md §13, web-build F15): the read-only plan a
 * family link opens, with no login. The endpoint is public and deliberately
 * narrow — plan, cost and progress only, never documents, answers or facts
 * (privacy principle C6).
 */

import { useQuery } from "@tanstack/react-query";
import { ai, unwrap } from "./client";

export type SharedStep = { name: string; country: string; status: string };

export type SharedPlan = {
  shared_by: string;
  plan: {
    title: string;
    steps: SharedStep[];
    months_to_arrival: number | null;
    leads_to_pr: boolean;
    cost: {
      spend_ngn: number | string | null;
      proof_of_funds_ngn: number | string | null;
      complete: boolean;
    };
  } | null;
  progress: { done: number; open: number };
};

export const shareKeys = { view: (token: string) => ["ai", "share", token] as const };

export function useSharedPlan(token: string) {
  return useQuery({
    queryKey: shareKeys.view(token),
    queryFn: () =>
      unwrap(
        ai.GET("/api/ai/v1/share/{token}/", { params: { path: { token } } }),
      ) as unknown as Promise<SharedPlan>,
    retry: false,
  });
}
