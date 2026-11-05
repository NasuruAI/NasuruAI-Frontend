import { apiFetch } from "@/lib/api";

export type PublicProgrammeFilters = {
  q: string;
  country: string;
  level: string;
  school_type: string;
  city: string;
  currency: string;
  tuition_min: string;
  tuition_max: string;
  duration_min: string;
  duration_max: string;
  language: string;
  intake_year: string;
  deadline_after: string;
  deadline_before: string;
  ordering: string;
  page: number;
  page_size: number;
};

export type PublicProgrammeSchool = {
  id: string;
  name: string;
  kind: string;
  country_name: string | null;
  country_code: string | null;
  city: string;
  province: string;
  website: string;
  description: string;
  logo_url: string;
};

export type PublicProgramme = {
  id: string;
  name: string;
  level: string;
  duration_months: number | null;
  tuition_amount: string | null;
  tuition_currency: string;
  language_of_instruction: string;
  intakes: string[];
  application_opens: string | null;
  application_deadline: string | null;
  school: PublicProgrammeSchool;
  applyboard: {
    program_level_label?: string;
    min_length?: number | null;
    max_length?: number | null;
    program_intakes?: { startDate?: string; openDate?: string; submissionDeadline?: string }[];
    tags?: string[];
    application_fee?: number | string | null;
    application_enabled?: boolean | null;
    success_score?: { label?: string; value?: number } | string | null;
  };
};

export type PublicProgrammePage = {
  count: number;
  next: string | null;
  previous: string | null;
  results: PublicProgramme[];
};

export type PublicProgrammeFilterOptions = {
  countries: { code: string; name: string; programme_count: number }[];
  levels: { value: string; label: string }[];
  school_types: { value: string; label: string }[];
  currencies: string[];
};

export const DEFAULT_PUBLIC_PROGRAMME_FILTERS: PublicProgrammeFilters = {
  q: "",
  country: "",
  level: "",
  school_type: "",
  city: "",
  currency: "",
  tuition_min: "",
  tuition_max: "",
  duration_min: "",
  duration_max: "",
  language: "",
  intake_year: "",
  deadline_after: "",
  deadline_before: "",
  ordering: "school__name",
  page: 1,
  page_size: 24,
};

const STRING_FILTER_KEYS = [
  "q",
  "country",
  "level",
  "school_type",
  "city",
  "currency",
  "tuition_min",
  "tuition_max",
  "duration_min",
  "duration_max",
  "language",
  "intake_year",
  "deadline_after",
  "deadline_before",
  "ordering",
] as const;
const FILTER_KEYS = [...STRING_FILTER_KEYS, "page", "page_size"] as const;

export function publicProgrammeFiltersFromSearch(search: string): PublicProgrammeFilters {
  const params = new URLSearchParams(search);
  const filters = { ...DEFAULT_PUBLIC_PROGRAMME_FILTERS };

  for (const key of STRING_FILTER_KEYS) {
    filters[key] = params.get(key) ?? filters[key];
  }

  const page = Number(params.get("page"));
  const pageSize = Number(params.get("page_size"));
  filters.page = Number.isSafeInteger(page) && page > 0 ? page : 1;
  filters.page_size = pageSize === 48 ? 48 : 24;
  return filters;
}

export function publicProgrammesRequest(filters: PublicProgrammeFilters): string {
  const params = new URLSearchParams();
  for (const key of FILTER_KEYS) {
    const value = filters[key];
    if (value !== "" && value !== DEFAULT_PUBLIC_PROGRAMME_FILTERS[key]) {
      params.set(key, String(value));
    }
  }
  return `/api/catalogue/programmes/?${params.toString()}`;
}

export async function fetchPublicProgrammes(
  filters: PublicProgrammeFilters,
  signal: AbortSignal,
): Promise<PublicProgrammePage> {
  return apiFetch<PublicProgrammePage>(publicProgrammesRequest(filters), { signal });
}

export async function fetchPublicProgrammeFilterOptions(
  signal: AbortSignal,
): Promise<PublicProgrammeFilterOptions> {
  return apiFetch<PublicProgrammeFilterOptions>("/api/catalogue/programme-filters/", { signal });
}
