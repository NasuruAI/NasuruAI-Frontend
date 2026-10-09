"use client";

/**
 * The funds checker (web.md §11.4, web-build F12): bank statements read
 * against a route's maintenance-funds rule, before an officer sees them.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CandidateDocument } from "./onboarding";
import { ai, unwrap } from "./client";
import type { components } from "./schema";

type Schemas = components["schemas"];
export type CheckStatus = Schemas["CheckStatusEnum"];

export type FundsCheckOutcome = "pass" | "fail" | "warn" | "unknown";
export type FundsCheckName =
  "coverage" | "lowest_balance" | "large_deposits" | "age" | "account_holder";

export type FundsCheckItem = {
  check: FundsCheckName;
  outcome: FundsCheckOutcome;
  detail: string;
  days?: number;
  needed?: number;
  lowest?: string;
  days_old?: number;
  deposits?: { date: string | null; amount: string; description: string }[];
  holders?: string[];
};

export type FundsResults = {
  verdict: "meets" | "falls_short" | "cant_tell";
  checks: FundsCheckItem[];
  currency: string;
};

export type StatementLine = {
  date: string;
  description: string;
  amount: number | null;
  balance: number | null;
};
export type Statement = {
  account_holder: string | null;
  bank: string | null;
  currency: string | null;
  period_start: string | null;
  period_end: string | null;
  opening_balance: number | null;
  closing_balance: number | null;
  lines: StatementLine[];
};

export type FundsCheck = Omit<Schemas["FundsCheck"], "results" | "extracted"> & {
  results: FundsResults | null;
  extracted: Statement[];
};

export const fundsKeys = {
  checks: ["ai", "funds", "checks"] as const,
  check: (id: string) => ["ai", "funds", "check", id] as const,
};

export function useFundsChecks() {
  return useQuery({
    queryKey: fundsKeys.checks,
    queryFn: async () =>
      (await unwrap(ai.GET("/api/ai/v1/me/funds-checks/"))) as unknown as FundsCheck[],
  });
}

/** Polled every 2 s while the statements are being read. */
export function useFundsCheck(id: string | null) {
  const client = useQueryClient();
  return useQuery({
    queryKey: fundsKeys.check(id ?? ""),
    queryFn: async () => {
      const check = (await unwrap(
        ai.GET("/api/ai/v1/me/funds-checks/{check_id}/", { params: { path: { check_id: id! } } }),
      )) as unknown as FundsCheck;
      if (check.status !== "checking")
        void client.invalidateQueries({ queryKey: fundsKeys.checks });
      return check;
    },
    enabled: Boolean(id),
    refetchInterval: (query) => (query.state.data?.status === "checking" ? 2000 : false),
  });
}

export function useStartFundsCheck() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ documents, route }: { documents: string[]; route?: string }) =>
      unwrap(
        ai.POST("/api/ai/v1/me/funds-checks/", {
          body: { documents, route: route ?? "" },
          headers: { "Idempotency-Key": crypto.randomUUID() },
        }),
      ) as unknown as Promise<FundsCheck>,
    onSuccess: () => void client.invalidateQueries({ queryKey: fundsKeys.checks }),
  });
}

/** A bank statement uploaded straight to the vault, ready to pick for a check. */
export function useUploadStatement() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => {
      const form = new FormData();
      form.append("file", file);
      form.append("kind", "bank_statement");
      return unwrap(
        ai.POST("/api/ai/v1/me/documents/", {
          body: form as never,
          bodySerializer: (body) => body as unknown as BodyInit,
        }),
      ) as unknown as Promise<CandidateDocument>;
    },
    onSuccess: () => void client.invalidateQueries({ queryKey: ["ai", "documents"] }),
  });
}

// ---------------------------------------------------------------------------
// Derived from `extracted`, for the coverage bar and balance chart: the same
// day-by-day carry-forward the backend's `daily_balances()` does, so the
// chart shows exactly what the verdict was computed from.
// ---------------------------------------------------------------------------

export type DailyBalance = { date: string; balance: number };

function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function dayDiff(a: string, b: string): number {
  return Math.round(
    (new Date(`${a}T00:00:00Z`).getTime() - new Date(`${b}T00:00:00Z`).getTime()) / 86_400_000,
  );
}

/** One merged series across every statement, carrying the balance forward over days without a line. */
export function dailyBalances(statements: Statement[]): DailyBalance[] {
  const known = new Map<string, number>();
  let start: string | null = null;
  let end: string | null = null;
  for (const statement of statements) {
    for (const line of statement.lines) {
      const day = (line.date || "").slice(0, 10);
      if (day && line.balance !== null) known.set(day, line.balance);
    }
    if (statement.period_start && (!start || statement.period_start < start))
      start = statement.period_start;
    if (statement.period_end && (!end || statement.period_end > end)) end = statement.period_end;
  }
  if (!start || !end) {
    const days = [...known.keys()].sort();
    if (!days.length) return [];
    start = days[0];
    end = days[days.length - 1];
  }
  const opening = statements.find((s) => s.opening_balance !== null)?.opening_balance ?? null;
  let balance = opening;
  const series: DailyBalance[] = [];
  for (let day = start, i = 0; dayDiff(end, day) >= 0 && i < 3660; day = addDays(day, 1), i++) {
    if (known.has(day)) balance = known.get(day)!;
    if (balance !== null) series.push({ date: day, balance });
  }
  return series;
}

/** The longest run of consecutive covered days, for the coverage bar. */
export function longestRun(
  series: DailyBalance[],
): { start: string; end: string; days: number } | null {
  if (!series.length) return null;
  let bestStart = series[0].date;
  let bestEnd = series[0].date;
  let runStart = series[0].date;
  for (let i = 1; i < series.length; i++) {
    const prev = series[i - 1].date;
    const curr = series[i].date;
    if (dayDiff(curr, prev) !== 1) runStart = curr;
    if (dayDiff(curr, runStart) > dayDiff(bestEnd, bestStart)) {
      bestStart = runStart;
      bestEnd = curr;
    }
  }
  return { start: bestStart, end: bestEnd, days: dayDiff(bestEnd, bestStart) + 1 };
}
