"use client";

/**
 * Study (web.md §10, web-build F11): programmes you can get into, by total
 * cost; scholarships you could hold; deadlines across your board; and
 * handing a programme off to the agency, with consent.
 */

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CostKind, CostLine } from "@/components/ai/evidence/Money";
import type { Check } from "@/components/ai/evidence/Trust";
import { ai, ApiError, unwrap } from "./client";
import { fileName, packKeys, type Card } from "./packs";
import type { components } from "./schema";

type Schemas = components["schemas"];
export type StudyLevel = Schemas["StudyProgrammeLevelEnum"];
export type ProgrammeResult = Schemas["ProgrammeResult"];
export type ProgrammeDetail = Schemas["ProgrammeDetail"];
export type ProgrammeSearchResponse = Schemas["ProgrammeSearchResponse"];
export type YourGrade = Schemas["YourGrade"];
export type Scholarship = Schemas["CataloguePublicScholarship"];
export type ScholarshipDetail = Schemas["ScholarshipDetail"];
export type ScholarshipEligibilityCheck = Schemas["ScholarshipEligibilityCheck"];
export type Deadline = Schemas["Deadline"];
export type Handoff = Schemas["Handoff"];
export type HandoffDisclosure = Schemas["HandoffDisclosure"];

export const STUDY_LEVELS: StudyLevel[] = [
  "foundation",
  "diploma",
  "bachelor",
  "master",
  "doctorate",
];

export const STUDY_LEVEL_LABEL: Record<StudyLevel, string> = {
  foundation: "Foundation / pathway",
  diploma: "Diploma",
  bachelor: "Bachelor's",
  master: "Master's",
  doctorate: "Doctorate",
};

export type StudySort = "cost_after_scholarships" | "cost" | "deadline" | "name";

export type StudyFilters = {
  level: StudyLevel | "";
  q: string;
  subject: string;
  city: string;
  language: string;
  postStudyWork: boolean;
  hasScholarships: boolean;
  /** Naira. */
  tuitionMax: number | null;
  /** Days. */
  intakeWithin: number | null;
  includeNotAdmissible: boolean;
  sort: StudySort;
};

export const DEFAULT_STUDY_FILTERS: StudyFilters = {
  level: "",
  q: "",
  subject: "",
  city: "",
  language: "",
  postStudyWork: false,
  hasScholarships: false,
  tuitionMax: null,
  intakeWithin: null,
  includeNotAdmissible: false,
  sort: "cost_after_scholarships",
};

export const INTAKE_WITHIN_OPTIONS = [30, 60, 90, 180];

export type FilterChip = { key: string; label: string; clear: Partial<StudyFilters> };

/** The filters in words, one chip each, with what removing it resets. */
export function filterChips(
  filters: Omit<StudyFilters, "includeNotAdmissible" | "sort">,
): FilterChip[] {
  const chips: FilterChip[] = [];
  if (filters.q.trim()) chips.push({ key: "q", label: `“${filters.q.trim()}”`, clear: { q: "" } });
  if (filters.level) {
    chips.push({ key: "level", label: STUDY_LEVEL_LABEL[filters.level], clear: { level: "" } });
  }
  if (filters.subject.trim()) {
    chips.push({ key: "subject", label: filters.subject.trim(), clear: { subject: "" } });
  }
  if (filters.city.trim()) {
    chips.push({ key: "city", label: filters.city.trim(), clear: { city: "" } });
  }
  if (filters.language) {
    chips.push({
      key: "language",
      label: `Taught in ${filters.language}`,
      clear: { language: "" },
    });
  }
  if (filters.postStudyWork) {
    chips.push({ key: "psw", label: "Leads to post-study work", clear: { postStudyWork: false } });
  }
  if (filters.hasScholarships) {
    chips.push({
      key: "scholarships",
      label: "A scholarship you could hold",
      clear: { hasScholarships: false },
    });
  }
  if (filters.tuitionMax) {
    chips.push({
      key: "tuition",
      label: `Under ₦${filters.tuitionMax.toLocaleString()}`,
      clear: { tuitionMax: null },
    });
  }
  if (filters.intakeWithin) {
    chips.push({
      key: "intake",
      label: `Deadline within ${filters.intakeWithin} days`,
      clear: { intakeWithin: null },
    });
  }
  return chips;
}

function studyQuery(
  filters: StudyFilters,
  page: number,
): Record<string, string | number | boolean> {
  const query: Record<string, string | number | boolean> = { sort: filters.sort };
  if (filters.level) query.level = filters.level;
  if (filters.q.trim()) query.q = filters.q.trim();
  if (filters.subject.trim()) query.subject = filters.subject.trim();
  if (filters.city.trim()) query.city = filters.city.trim();
  if (filters.language) query.language = filters.language;
  if (filters.postStudyWork) query.post_study_work = true;
  if (filters.hasScholarships) query.has_scholarships = true;
  if (filters.tuitionMax) query.tuition_max = filters.tuitionMax;
  if (filters.intakeWithin) query.intake_within = filters.intakeWithin;
  if (filters.includeNotAdmissible) query.include_not_admissible = true;
  if (page > 1) query.page = page;
  return query;
}

export const studyKeys = {
  programmes: (filters: StudyFilters, page: number) =>
    ["ai", "study-programmes", filters, page] as const,
  programme: (id: string) => ["ai", "study-programme", id] as const,
  scholarships: (country: string, level: string) =>
    ["ai", "study-scholarships", country, level] as const,
  scholarship: (id: string, country: string, level: string) =>
    ["ai", "study-scholarship", id, country, level] as const,
  grade: ["ai", "my-grade"] as const,
  handoffDisclosure: ["ai", "handoff-disclosure"] as const,
  handoffs: ["ai", "handoffs"] as const,
  deadlines: (type: string) => ["ai", "deadlines", type] as const,
};

export function useProgrammes(filters: StudyFilters, page = 1) {
  return useQuery({
    queryKey: studyKeys.programmes(filters, page),
    queryFn: () =>
      unwrap(
        ai.GET("/api/ai/v1/study/programmes/", { params: { query: studyQuery(filters, page) } }),
      ),
    placeholderData: keepPreviousData,
  });
}

export function useProgramme(id: string) {
  return useQuery({
    queryKey: studyKeys.programme(id),
    queryFn: () =>
      unwrap(
        ai.GET("/api/ai/v1/study/programmes/{programme_id}/", {
          params: { path: { programme_id: id } },
        }),
      ),
    retry: false,
  });
}

export function useScholarships(country: string, level: string) {
  return useQuery({
    queryKey: studyKeys.scholarships(country, level),
    queryFn: () =>
      unwrap(
        ai.GET("/api/ai/v1/study/scholarships/", {
          params: {
            query: { country: country || undefined, level: (level || undefined) as never },
          },
        }),
      ),
  });
}

export function useScholarship(id: string, country: string, level: string) {
  return useQuery({
    queryKey: studyKeys.scholarship(id, country, level),
    queryFn: () =>
      unwrap(
        ai.GET("/api/ai/v1/study/scholarships/{scholarship_id}/", {
          params: {
            path: { scholarship_id: id },
            query: { country: country || undefined, level: (level || undefined) as never },
          },
        }),
      ),
    enabled: Boolean(id),
    retry: false,
  });
}

/** How your degree result converts, with the working (principle A4). */
export function useMyGrade() {
  return useQuery({
    queryKey: studyKeys.grade,
    queryFn: async () => {
      const result = await unwrap(ai.GET("/api/ai/v1/me/grade/"));
      return result as unknown as { degree: unknown; converted: YourGrade | null };
    },
  });
}

export function useHandoffDisclosure() {
  return useQuery({
    queryKey: studyKeys.handoffDisclosure,
    queryFn: () => unwrap(ai.GET("/api/ai/v1/handoff/disclosure/")),
    staleTime: 60 * 60 * 1000,
  });
}

export function useHandoffs() {
  return useQuery({
    queryKey: studyKeys.handoffs,
    queryFn: () => unwrap(ai.GET("/api/ai/v1/me/handoffs/")),
  });
}

/** "Want a person to handle this?" — only after reading the disclosure (web.md §10.5). */
export function useRequestHandoff() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      message = "",
      ...rest
    }: {
      consent: boolean;
      disclosure_version: string;
      programme_ids?: string[];
      message?: string;
    }) => unwrap(ai.POST("/api/ai/v1/me/handoffs/", { body: { ...rest, message } })),
    onSuccess: (handoff) =>
      client.setQueryData<Handoff[]>(studyKeys.handoffs, (list) => [handoff, ...(list ?? [])]),
  });
}

export function useWithdrawHandoff() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      unwrap(
        ai.POST("/api/ai/v1/me/handoffs/{handoff_id}/withdraw/", {
          params: { path: { handoff_id: id } },
        }),
      ),
    onSuccess: (handoff) =>
      client.setQueryData<Handoff[]>(studyKeys.handoffs, (list) =>
        list?.map((other) => (other.id === handoff.id ? handoff : other)),
      ),
  });
}

// --- Add to board (reuses the board's own card endpoint, M4-6) -------------------------

type Board = { columns: { state: string; label: string; cards: Card[] }[] };

/** Whether this programme (any intake) already has a board card. */
export function useProgrammeCard(programmeId: string | undefined) {
  return useQuery({
    queryKey: packKeys.board,
    queryFn: async () => (await unwrap(ai.GET("/api/ai/v1/me/applications/"))) as unknown as Board,
    enabled: Boolean(programmeId),
    select: (board) =>
      board.columns
        .flatMap((column) => column.cards)
        .find((card) => card.programme === programmeId) ?? null,
  });
}

export function useAddToBoard() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ programmeId, intakeId }: { programmeId: string; intakeId?: string | null }) =>
      unwrap(
        ai.POST("/api/ai/v1/me/applications/", {
          body: { programme: programmeId, intake: intakeId ?? null },
        }),
      ),
    onSuccess: () => void client.invalidateQueries({ queryKey: packKeys.board }),
  });
}

// --- Deadlines (web.md §10.4) -----------------------------------------------------

export function useMyDeadlines(type = "") {
  return useQuery({
    queryKey: studyKeys.deadlines(type || "all"),
    queryFn: () =>
      unwrap(
        ai.GET("/api/ai/v1/me/deadlines/", { params: { query: { type: type || undefined } } }),
      ),
  });
}

/** Fetched and saved (needs the session token, so it can't just be a plain link). */
export async function downloadDeadlinesIcs() {
  const { data, response } = await ai.GET("/api/ai/v1/me/deadlines/ics/", { parseAs: "blob" });
  if (!response.ok || !data)
    throw new ApiError("That download didn't work. Try again.", response.status);
  const url = URL.createObjectURL(data as Blob);
  const link = window.document.createElement("a");
  link.href = url;
  link.download = fileName(response.headers.get("Content-Disposition"), "nasuru-deadlines.ics");
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// --- Display helpers ---------------------------------------------------------------

/** ProgrammeResult.admissibility as ProgrammeCard's "yes" | "if" | "no". */
export const ADMISSIBLE_PILL = { admissible: "yes", maybe: "if", not_admissible: "no" } as const;

/** ProgrammeDetail.admissibility / ScholarshipDetail.status as a StatusPill kind. */
export const ADMISSIBILITY_STATUS = {
  admissible: "eligible",
  maybe: "eligible_if",
  not_admissible: "not_eligible",
} as const;
export const ELIGIBILITY_STATUS = {
  eligible: "eligible",
  maybe: "eligible_if",
  not_eligible: "not_eligible",
} as const;

/** "Full tuition", "€1,200 a month", or the provider's own words. */
export function scholarshipValueText(
  scholarship: Pick<
    Scholarship,
    "value_text" | "covers_full_tuition" | "value_amount" | "value_currency"
  >,
): string {
  if (scholarship.value_text) return scholarship.value_text;
  if (scholarship.covers_full_tuition) return "Full tuition";
  if (scholarship.value_amount) {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: scholarship.value_currency || "NGN",
      maximumFractionDigits: 0,
    }).format(Number(scholarship.value_amount));
  }
  return "Amount not stated";
}

/** "uk_class" -> "UK class"; "prior_level" -> "Prior level". */
function humaniseKind(kind: string): string {
  const words = kind.replace(/_/g, " ");
  return words === "uk class" ? "UK class" : words.charAt(0).toUpperCase() + words.slice(1);
}

export function admissibilityCheckRows(checks: ProgrammeDetail["admissibility_checks"]): Check[] {
  return checks.map((check) => ({
    name: `${humaniseKind(check.kind)}: ${check.requirement}`,
    outcome: check.outcome,
    evidence: check.detail,
  }));
}

export function scholarshipCheckRows(checks: ScholarshipEligibilityCheck[]): Check[] {
  return checks.map((check) => ({
    name: humaniseKind(check.kind),
    outcome: check.outcome,
    evidence: check.detail,
  }));
}

// --- Cost lines, for the CostBreakdown component ----------------------------------

const COST_KIND_BY_LABEL: [RegExp, CostKind][] = [
  [/tuition/i, "tuition"],
  [/living/i, "living"],
  [/visa|health|immigration/i, "visa"],
  [/test|exam|ielts|toefl|language/i, "tests"],
  [/travel|flight/i, "travel"],
];

function kindForLabel(label: string): CostKind {
  return COST_KIND_BY_LABEL.find(([pattern]) => pattern.test(label))?.[1] ?? "other";
}

/** A programme's cost as CostBreakdown lines: spend first, proof of funds after. */
export function programmeCostLines(cost: ProgrammeResult["cost"]): CostLine[] {
  const line = (kind: CostKind, item: Schemas["CostLine"]): CostLine => ({
    kind,
    label: item.label,
    naira: Number(item.ngn),
    foreign:
      item.currency !== "NGN"
        ? { amount: Number(item.amount), currency: item.currency }
        : undefined,
    source: item.source_name
      ? {
          name: item.source_name,
          url: item.source_url ?? undefined,
          checkedOn: item.verified_at ?? undefined,
          stale: item.stale,
        }
      : undefined,
  });
  return [
    ...cost.lines
      .filter((item) => item.ngn !== null)
      .map((item) => line(kindForLabel(item.label), item)),
    ...cost.proof_of_funds
      .filter((item) => item.ngn !== null)
      .map((item) => line("proof_of_funds", item)),
  ];
}
