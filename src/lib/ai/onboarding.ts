"use client";

/**
 * Onboarding data (web.md §4, web-build F5): the seven steps, where a returning
 * candidate resumes, and the queries and saves each step makes.
 *
 * Every step saves as it goes (principles E4), so there is no draft to lose:
 * where to resume is worked out from what the API already holds.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ai, unwrap } from "./client";
import type { components } from "./schema";
import { shellKeys } from "./shell";

export {
  isStep,
  minutesLeft,
  nextStep,
  previousStep,
  resumeStep,
  STEPS,
  stepHref,
  stepIndex,
  type StepSlug,
} from "./onboarding-steps";

type Schemas = components["schemas"];
export type Me = Schemas["Me"];
export type CandidateDocument = Schemas["CandidateDocument"];
export type DocumentKind = Schemas["DocumentKindEnum"];
export type Questionnaire = Schemas["Questionnaire"];
export type QuestionnaireChanges = Omit<Partial<Questionnaire>, "completed_at">;
export type ProfileFact = Schemas["ProfileFact"];
export type FactKind = Schemas["ProfileFactKindEnum"];
export type OccupationSuggestion = Schemas["OccupationSuggestion"];
export type CandidateOccupation = Schemas["CandidateOccupation"];
export type CompareRow = Schemas["CompareRow"];
export type EligibilityResult = Schemas["EligibilityResult"];

export const onboardingKeys = {
  documents: ["ai", "documents"] as const,
  questionnaire: ["ai", "questionnaire"] as const,
  facts: ["ai", "facts"] as const,
  occupation: ["ai", "occupation"] as const,
  suggestions: ["ai", "occupation", "suggestions"] as const,
  compare: ["ai", "compare"] as const,
  eligibility: ["ai", "eligibility"] as const,
  pathways: ["ai", "pathways"] as const,
};

/** A document still being read by the model. */
export function isReading(document: CandidateDocument): boolean {
  return document.status === "uploaded" || document.status === "extracting";
}

/** The candidate's documents; polled every 3 s while any is still being read. */
export function useDocuments() {
  return useQuery({
    queryKey: onboardingKeys.documents,
    queryFn: () => unwrap(ai.GET("/api/ai/v1/me/documents/")),
    refetchInterval: (query) => (query.state.data?.some(isReading) ? 3000 : false),
  });
}

export function useQuestionnaire() {
  return useQuery({
    queryKey: onboardingKeys.questionnaire,
    queryFn: () => unwrap(ai.GET("/api/ai/v1/me/questionnaire/")),
  });
}

/** Save answers as they change. The response is the whole questionnaire. */
export function useSaveQuestionnaire() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (changes: QuestionnaireChanges) =>
      unwrap(
        ai.PATCH("/api/ai/v1/me/questionnaire/", {
          body: changes as Schemas["PatchedQuestionnaireRequest"],
        }),
      ),
    onSuccess: (saved) => {
      client.setQueryData(onboardingKeys.questionnaire, saved);
      void client.invalidateQueries({ queryKey: shellKeys.me });
    },
  });
}

/** Facts, rejected ones left out. Polled while a document is being read. */
export function useFacts({ poll = false }: { poll?: boolean } = {}) {
  return useQuery({
    queryKey: onboardingKeys.facts,
    queryFn: async () =>
      (await unwrap(ai.GET("/api/ai/v1/me/facts/"))).filter((fact) => fact.status !== "rejected"),
    refetchInterval: poll ? 3000 : false,
  });
}

type FactAction =
  | { type: "confirm"; fact: ProfileFact }
  | { type: "reject"; fact: ProfileFact }
  | { type: "edit"; fact: ProfileFact; data: Record<string, unknown> };

/**
 * Confirm, reject or edit a fact. Each carries the version it was shown at;
 * a 409 means another device changed it first, and the fresh list is loaded.
 */
export function useFactAction() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (action: FactAction) => {
      const params = { path: { fact_id: action.fact.id } };
      const version = action.fact.version ?? 1;
      if (action.type === "edit") {
        return unwrap(
          ai.PATCH("/api/ai/v1/me/facts/{fact_id}/", {
            params,
            body: { version, data: action.data },
          }),
        );
      }
      const path =
        action.type === "confirm"
          ? "/api/ai/v1/me/facts/{fact_id}/confirm/"
          : "/api/ai/v1/me/facts/{fact_id}/reject/";
      return unwrap(ai.POST(path, { params, body: { version } }));
    },
    onSettled: () => {
      void client.invalidateQueries({ queryKey: onboardingKeys.facts });
      // Suggestions come from confirmed jobs.
      void client.invalidateQueries({ queryKey: onboardingKeys.suggestions });
      void client.invalidateQueries({ queryKey: shellKeys.me });
    },
  });
}

/** A fact the candidate adds themselves: confirmed on creation. */
export function useAddFact() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ kind, data }: { kind: FactKind; data: Record<string, unknown> }) =>
      unwrap(
        ai.POST("/api/ai/v1/me/facts/", {
          body: { kind, data },
          headers: { "Idempotency-Key": crypto.randomUUID() },
        }),
      ),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: onboardingKeys.facts });
      // Suggestions come from confirmed jobs.
      void client.invalidateQueries({ queryKey: onboardingKeys.suggestions });
      void client.invalidateQueries({ queryKey: shellKeys.me });
    },
  });
}

/** Record which cards the candidate has seen: "Confirm remaining" needs all of them (D2). */
export function markFactsViewed(ids: string[]) {
  return unwrap(ai.POST("/api/ai/v1/me/facts/viewed/", { body: { ids } }));
}

export function useConfirmViewed() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => unwrap(ai.POST("/api/ai/v1/me/facts/confirm-viewed/")),
    onSettled: () => {
      void client.invalidateQueries({ queryKey: onboardingKeys.facts });
      // Suggestions come from confirmed jobs.
      void client.invalidateQueries({ queryKey: onboardingKeys.suggestions });
      void client.invalidateQueries({ queryKey: shellKeys.me });
    },
  });
}

/** The chosen occupation, or null before one is chosen (the API answers 404). */
export function useOccupation() {
  return useQuery({
    queryKey: onboardingKeys.occupation,
    queryFn: async () => {
      const { data, response } = await ai.GET("/api/ai/v1/me/occupation/");
      if (response.status === 404) return null;
      if (!response.ok) throw new Error(`Occupation request failed (${response.status}).`);
      return data as CandidateOccupation;
    },
  });
}

export function useOccupationSuggestions() {
  return useQuery({
    queryKey: onboardingKeys.suggestions,
    queryFn: () => unwrap(ai.GET("/api/ai/v1/me/occupation/suggestions/")),
  });
}

export function searchOccupations(q: string, system = "isco08") {
  return unwrap(
    ai.GET("/api/ai/v1/occupations/search/", {
      params: { query: { q, system: system as Schemas["SystemEnum"] } },
    }),
  );
}

export function useSetOccupation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (choice: { system: string; code: string }) =>
      unwrap(
        ai.POST("/api/ai/v1/me/occupation/", {
          body: { system: choice.system as Schemas["SystemEnum"], code: choice.code },
        }),
      ),
    onSuccess: (occupation) => {
      client.setQueryData(onboardingKeys.occupation, occupation);
      void client.invalidateQueries({ queryKey: onboardingKeys.compare });
    },
  });
}

export function useCompare() {
  return useQuery({
    queryKey: onboardingKeys.compare,
    queryFn: () => unwrap(ai.GET("/api/ai/v1/me/compare/")),
  });
}

export function useEligibility(enabled: boolean) {
  return useQuery({
    queryKey: onboardingKeys.eligibility,
    queryFn: () => unwrap(ai.GET("/api/ai/v1/me/eligibility/")),
    enabled,
  });
}

export type PathwayStep = {
  code: string;
  name: string;
  country: string;
  family: string;
  status: string;
  gaps: { key: string; text: string }[];
  months: number | null;
  leads_to_pr: boolean;
};

export type Pathway = {
  codes: string[];
  title: string;
  steps: PathwayStep[];
  band: "high" | "medium" | "low";
  leads_to_pr: boolean;
  months_to_arrival: number | null;
  cost: {
    spend_ngn?: string;
    proof_of_funds_ngn?: string;
    complete?: boolean;
    items?: CostItem[];
    routes_not_costed?: string[];
  };
};

/** One priced line of a pathway (apps.pathways.services.pathway_cost). */
export type CostItem = {
  route: string;
  category: string;
  label: string;
  amount: string;
  currency: string;
  ngn: string | null;
  source_name?: string;
  source_url?: string;
  verified_at?: string;
  recheck_after?: string | null;
  is_stale?: boolean;
};

export function usePathways(enabled: boolean) {
  return useQuery({
    queryKey: onboardingKeys.pathways,
    queryFn: async () => {
      const body = (await unwrap(ai.GET("/api/ai/v1/me/plan/pathways/"))) as {
        pathways: Pathway[];
      };
      return body.pathways;
    },
    enabled,
  });
}

/** "Build my plan": choose the pathway, then mark onboarding finished. */
export function useFinishOnboarding() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (codes: string[] | null) => {
      if (codes) {
        await unwrap(
          ai.POST("/api/ai/v1/me/plan/", {
            body: { codes },
            headers: { "Idempotency-Key": crypto.randomUUID() },
          }),
        );
      }
      return unwrap(ai.POST("/api/ai/v1/me/onboarding/complete/"));
    },
    onSuccess: (me) => {
      client.setQueryData(shellKeys.me, me);
      void client.invalidateQueries({ queryKey: ["ai"] });
    },
  });
}
