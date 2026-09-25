"use client";

/**
 * Jobs (web.md §7, web-build F8): verified jobs ranked by fit, a job's trust
 * checks, saving, scam reports, job alerts (US-204) and the offer checker.
 */

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Check } from "@/components/ai/evidence/Trust";
import { ai, unwrap } from "./client";
import type { components } from "./schema";

type Schemas = components["schemas"];
export type JobCheck = Schemas["JobCheck"];
export type OfferCheck = Schemas["OfferCheck"];
export type AnswerPack = Schemas["AnswerPack"];
export type AlertSettings = Schemas["JobAlertSettings"];
export type AlertSent = Schemas["JobAlertSent"];

export type Job = {
  id: string;
  title: string;
  employer: string;
  country: string;
  location_text: string;
  remote: boolean;
  employment_type: string;
  apply_url: string;
  salary_min: string | null;
  salary_max: string | null;
  salary_currency: string;
  salary_period: string;
  salary_is_estimate: boolean;
  posted_at: string | null;
  trust_score: number | null;
  trust_band: string;
  checked_at: string | null;
  fit: { score: number; reasons: string[]; excluded?: string | null };
  saved: boolean;
};

export type JobDetail = Job & { description_html: string; checks: JobCheck[] };

export type JobsPage = {
  country: string;
  count: number;
  page: number;
  page_size: number;
  results: Job[];
  not_shown: {
    failed_verification: number;
    caution: number;
    being_checked: number;
    needs_german: number;
  };
  explanation: string;
};

export type SavedJob = Omit<Job, "fit" | "saved"> & {
  saved_at: string;
  available: boolean;
  closed: boolean;
};

export type JobFilters = {
  q: string;
  remote: boolean;
  include_caution: boolean;
  sort: "fit" | "recent" | "trust";
};

export const DEFAULT_FILTERS: JobFilters = {
  q: "",
  remote: false,
  include_caution: false,
  sort: "fit",
};

export const jobKeys = {
  list: (filters: JobFilters, page: number) => ["ai", "jobs", filters, page] as const,
  lists: ["ai", "jobs"] as const,
  detail: (id: string) => ["ai", "job", id] as const,
  saved: ["ai", "saved-jobs"] as const,
  fx: (currency: string) => ["fx", currency] as const,
  alerts: ["ai", "job-alerts"] as const,
  alertHistory: ["ai", "job-alerts", "sent"] as const,
  offers: ["ai", "offer-checks"] as const,
  offer: (id: string) => ["ai", "offer-check", id] as const,
};

/** The query string the list endpoint takes; defaults are left out. */
export function jobQuery(
  filters: JobFilters,
  page: number,
): Record<string, string | number | boolean> {
  const query: Record<string, string | number | boolean> = { sort: filters.sort };
  if (filters.q.trim()) query.q = filters.q.trim();
  if (filters.remote) query.remote = true;
  if (filters.include_caution) query.include_caution = true;
  if (page > 1) query.page = page;
  return query;
}

export function useJobs(filters: JobFilters, page = 1) {
  return useQuery({
    queryKey: jobKeys.list(filters, page),
    queryFn: async () =>
      (await unwrap(
        ai.GET("/api/ai/v1/jobs/", { params: { query: jobQuery(filters, page) as never } }),
      )) as unknown as JobsPage,
    placeholderData: keepPreviousData,
  });
}

export function useJob(id: string) {
  return useQuery({
    queryKey: jobKeys.detail(id),
    queryFn: async () =>
      (await unwrap(
        ai.GET("/api/ai/v1/jobs/{job_id}/", { params: { path: { job_id: id } } }),
      )) as unknown as JobDetail,
    retry: false,
  });
}

/** Save or unsave. Optimistic across every cached list and the detail. */
export function useSaveJob() {
  const client = useQueryClient();
  const setSaved = (id: string, saved: boolean) => {
    client.setQueriesData<JobsPage>({ queryKey: jobKeys.lists }, (page) =>
      page?.results
        ? { ...page, results: page.results.map((job) => (job.id === id ? { ...job, saved } : job)) }
        : page,
    );
    client.setQueryData<JobDetail>(jobKeys.detail(id), (job) => (job ? { ...job, saved } : job));
  };
  return useMutation({
    mutationFn: async ({ id, saved }: { id: string; saved: boolean }) => {
      const params = { params: { path: { job_id: id } } };
      if (saved) await unwrap(ai.POST("/api/ai/v1/jobs/{job_id}/save/", params));
      else await unwrap(ai.DELETE("/api/ai/v1/jobs/{job_id}/save/", params));
      return saved;
    },
    onMutate: ({ id, saved }) => setSaved(id, saved),
    onError: (_error, { id, saved }) => setSaved(id, !saved),
    onSettled: () => void client.invalidateQueries({ queryKey: jobKeys.saved }),
  });
}

export function useSavedJobs() {
  return useQuery({
    queryKey: jobKeys.saved,
    queryFn: async () =>
      ((await unwrap(ai.GET("/api/ai/v1/me/saved-jobs/"))) as unknown as { results: SavedJob[] })
        .results,
  });
}

export type ReportInput = { details: string; anonymous: boolean; consent_to_publish: boolean };

export function useReportJob() {
  return useMutation({
    mutationFn: ({ id, ...body }: ReportInput & { id: string }) =>
      unwrap(
        ai.POST("/api/ai/v1/jobs/{job_id}/report/", { params: { path: { job_id: id } }, body }),
      ),
  });
}

/** "Prepare answers": the pack for this job (the same one until the profile changes). */
export function useRequestPack() {
  return useMutation({
    mutationFn: (jobId: string) =>
      unwrap(
        ai.POST("/api/ai/v1/jobs/{job_id}/answer-pack/", {
          params: { path: { job_id: jobId } },
          headers: { "Idempotency-Key": crypto.randomUUID() },
        }),
      ),
  });
}

/** Naira per unit of `currency`, with the rate's date and source. One request per currency. */
export function useFxRate(currency: string | null | undefined) {
  return useQuery({
    queryKey: jobKeys.fx(currency ?? ""),
    queryFn: async () => {
      const result = await unwrap(
        ai.GET("/api/ai/v1/fx/convert/", {
          params: { query: { amount: "1", currency: currency! } },
        }),
      );
      return { rate: Number(result.rate), on: result.as_of, source: result.source_name };
    },
    enabled: Boolean(currency) && currency !== "NGN",
    staleTime: 60 * 60 * 1000,
    retry: false,
  });
}

/** "€48,000–€56,000 a year": the job's own figures, in its own currency. */
export function salaryRange(job: Pick<Job, "salary_min" | "salary_max" | "salary_currency">): {
  min: number;
  max: number;
} | null {
  const min = Number(job.salary_min ?? job.salary_max);
  const max = Number(job.salary_max ?? job.salary_min);
  if (!job.salary_currency || !Number.isFinite(min) || min <= 0) return null;
  return { min, max: Number.isFinite(max) && max > 0 ? max : min };
}

/** Whole days since a date: 0 today, 3 three days ago. */
export function daysSince(value: string, now: Date = new Date()): number {
  const then = new Date(value);
  const a = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const b = Date.UTC(then.getFullYear(), then.getMonth(), then.getDate());
  return Math.round((a - b) / 86_400_000);
}

/** A job's trust checks as CheckList rows, with their evidence and source. */
export function checkRows(checks: JobCheck[]): Check[] {
  return checks.map((check) => ({
    name: check.label,
    outcome: check.outcome,
    evidence: check.evidence,
    source: check.source_url ? { name: "Evidence", url: check.source_url } : undefined,
  }));
}

// --- Job alerts (US-204) ----------------------------------------------------------

export function useAlertSettings() {
  return useQuery({
    queryKey: jobKeys.alerts,
    queryFn: () => unwrap(ai.GET("/api/ai/v1/me/job-alerts/")),
  });
}

export function useUpdateAlerts() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (changes: Partial<Pick<AlertSettings, "enabled" | "min_fit" | "max_jobs">>) =>
      unwrap(ai.PATCH("/api/ai/v1/me/job-alerts/", { body: changes })),
    onSuccess: (settings) => client.setQueryData(jobKeys.alerts, settings),
  });
}

export function useAlertHistory() {
  return useQuery({
    queryKey: jobKeys.alertHistory,
    queryFn: () => unwrap(ai.GET("/api/ai/v1/me/job-alerts/sent/")),
  });
}

// --- The offer checker (M2-9) ------------------------------------------------------

export type OfferResult = {
  check: string;
  label: string;
  outcome: "pass" | "fail" | "unknown";
  evidence: string;
  source_url?: string;
};

export type NextStep = {
  action: string;
  label: string;
  value?: unknown;
  source_url?: string;
  employer_id?: string;
};

export function useOfferChecks() {
  return useQuery({
    queryKey: jobKeys.offers,
    queryFn: () => unwrap(ai.GET("/api/ai/v1/checks/offers/")),
  });
}

/** One check, polled every 2 s while it runs. */
export function useOfferCheck(id: string | null) {
  return useQuery({
    queryKey: jobKeys.offer(id ?? ""),
    queryFn: () =>
      unwrap(
        ai.GET("/api/ai/v1/checks/offers/{check_id}/", { params: { path: { check_id: id! } } }),
      ),
    enabled: Boolean(id),
    refetchInterval: (query) => (query.state.data?.status === "checking" ? 2000 : false),
  });
}

/** Paste text or upload a file (PDF or screenshot). */
export function useStartOfferCheck() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ text, file }: { text?: string; file?: File }) => {
      const headers = { "Idempotency-Key": crypto.randomUUID() };
      if (file) {
        const form = new FormData();
        form.append("file", file);
        if (text) form.append("text", text);
        return unwrap(
          ai.POST("/api/ai/v1/checks/offers/", {
            body: form as never,
            bodySerializer: (body) => body as unknown as BodyInit,
            headers,
          }),
        );
      }
      return unwrap(ai.POST("/api/ai/v1/checks/offers/", { body: { text: text ?? "" }, headers }));
    },
    onSuccess: () => void client.invalidateQueries({ queryKey: jobKeys.offers }),
  });
}

export function useReportOffer() {
  return useMutation({
    mutationFn: ({ id, ...body }: ReportInput & { id: string }) =>
      unwrap(
        ai.POST("/api/ai/v1/checks/offers/{check_id}/report/", {
          params: { path: { check_id: id } },
          body,
        }),
      ),
  });
}

/** The verdict's report routes (EFCC, NAPTIP), from the API's sourced facts. */
export function reportRoutes(
  steps: NextStep[],
): { label: string; href: string; detail?: string }[] {
  return steps
    .filter(
      (step) =>
        step.action.startsWith("report_") && step.action !== "report_to_us" && step.source_url,
    )
    .map((step) => ({
      label: step.label,
      href: step.source_url!,
      detail: step.value !== undefined && step.value !== null ? String(step.value) : undefined,
    }));
}
