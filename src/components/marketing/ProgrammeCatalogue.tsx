"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowDownWideNarrow,
  GraduationCap,
  RefreshCw,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { buttonClasses } from "@/components/ui/buttonStyles";
import { ApiError } from "@/lib/api";
import {
  DEFAULT_PUBLIC_PROGRAMME_FILTERS,
  fetchPublicProgrammeFilterOptions,
  fetchPublicProgrammes,
  publicProgrammeFiltersFromSearch,
  type PublicProgramme,
  type PublicProgrammeFilterOptions,
  type PublicProgrammeFilters,
  type PublicProgrammePage,
} from "@/lib/public-programmes";

const SORT_OPTIONS = [
  { value: "school__name", label: "School name A–Z" },
  { value: "name", label: "Programme name A–Z" },
  { value: "duration_months", label: "Shortest duration" },
  { value: "application_deadline", label: "Soonest deadline" },
  { value: "-tuition_amount", label: "Highest tuition first" },
  { value: "tuition_amount", label: "Lowest tuition first" },
];

function messageFor(error: unknown) {
  if (error instanceof ApiError) return error.message;
  return "We couldn't load programmes. Check your connection and try again.";
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block min-w-0">
      <span className="mb-1.5 block text-sm font-semibold text-ink">{label}</span>
      {children}
    </label>
  );
}

const inputClass =
  "h-11 w-full rounded-lg border border-field-line bg-surface px-3 text-body text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent/20";

function CatalogueSkeleton() {
  return (
    <div
      className="grid gap-5 md:grid-cols-2 xl:grid-cols-3"
      aria-label="Loading programmes"
      aria-busy="true"
    >
      {Array.from({ length: 6 }, (_, index) => (
        <div key={index} className="h-[34rem] animate-pulse rounded-2xl bg-sunken" />
      ))}
    </div>
  );
}

export type ProgrammeCatalogueProps = {
  /** URL the filters/pagination push to, e.g. "/ai/programs". */
  basePath: string;
  /** Renders a single result card (read-only, or a "start application" card). */
  renderCard: (programme: PublicProgramme) => React.ReactNode;
  /** Heading above the results grid. */
  resultsTitle?: string;
  /** Noun used in the result count ("12 programmes · Showing 1–24"). */
  itemNoun?: string;
};

/**
 * The shared school/programme catalogue: the full filter form, URL-driven
 * state, and proper pagination. Used by the public /ai/programs page and the
 * /ai/my-application/new picker — the only difference is the card each renders.
 */
export function ProgrammeCatalogue({
  basePath,
  renderCard,
  resultsTitle = "Programmes to compare",
  itemNoun = "programmes",
}: ProgrammeCatalogueProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const search = searchParams.toString();
  const filters = useMemo(() => publicProgrammeFiltersFromSearch(search), [search]);
  const [draftState, setDraftState] = useState(() => ({ search, filters }));
  const draft = draftState.search === search ? draftState.filters : filters;
  const [filterOptions, setFilterOptions] = useState<PublicProgrammeFilterOptions | null>(null);
  const [filterOptionsError, setFilterOptionsError] = useState("");
  const [retry, setRetry] = useState(0);
  const [retryOptions, setRetryOptions] = useState(0);
  const requestKey = `${search}:${retry}`;
  const [requestState, setRequestState] = useState<{
    key: string;
    status: "loading" | "ready" | "error";
    data: PublicProgrammePage | null;
    error: string;
  }>(() => ({ key: requestKey, status: "loading", data: null, error: "" }));
  const isCurrentRequest = requestState.key === requestKey;
  const loading = !isCurrentRequest || requestState.status === "loading";
  const error = isCurrentRequest ? requestState.error : "";
  const pageData = isCurrentRequest ? requestState.data : null;

  function changeDraft<K extends keyof PublicProgrammeFilters>(
    key: K,
    value: PublicProgrammeFilters[K],
  ) {
    setDraftState((current) => {
      const currentFilters = current.search === search ? current.filters : filters;
      return { search, filters: { ...currentFilters, [key]: value } };
    });
  }

  useEffect(() => {
    const controller = new AbortController();
    fetchPublicProgrammeFilterOptions(controller.signal)
      .then(setFilterOptions)
      .catch((cause: unknown) => {
        if (cause instanceof Error && cause.name === "AbortError") return;
        setFilterOptionsError(messageFor(cause));
      });
    return () => controller.abort();
  }, [retryOptions]);

  useEffect(() => {
    const controller = new AbortController();
    fetchPublicProgrammes(filters, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) {
          setRequestState({ key: requestKey, status: "ready", data, error: "" });
        }
      })
      .catch((cause: unknown) => {
        if (cause instanceof Error && cause.name === "AbortError") return;
        setRequestState({
          key: requestKey,
          status: "error",
          data: null,
          error: messageFor(cause),
        });
      });
    return () => controller.abort();
  }, [filters, requestKey]);

  const navigate = useCallback(
    (next: PublicProgrammeFilters) => {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(next)) {
        if (
          value !== "" &&
          value !== DEFAULT_PUBLIC_PROGRAMME_FILTERS[key as keyof PublicProgrammeFilters]
        ) {
          params.set(key, String(value));
        }
      }
      const query = params.toString();
      router.push(query ? `${basePath}?${query}` : basePath, { scroll: false });
    },
    [router, basePath],
  );

  useEffect(() => {
    if (draftState.search !== search) return;
    const hasUnappliedChanges = (
      Object.keys(draftState.filters) as (keyof PublicProgrammeFilters)[]
    ).some((key) => {
      return draftState.filters[key] !== filters[key];
    });
    if (!hasUnappliedChanges) return;

    const timeout = window.setTimeout(() => {
      navigate({ ...draftState.filters, page: 1 });
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [draftState, filters, navigate, search]);

  function submitFilters(event: React.FormEvent) {
    event.preventDefault();
    navigate({ ...draft, page: 1 });
  }

  function clearFilters() {
    setDraftState({ search: "", filters: DEFAULT_PUBLIC_PROGRAMME_FILTERS });
    router.push(basePath, { scroll: false });
  }

  const count = pageData?.count ?? 0;
  const totalPages = pageData ? Math.max(1, Math.ceil(count / filters.page_size)) : 1;
  const firstResult = count ? (filters.page - 1) * filters.page_size + 1 : 0;
  const lastResult = Math.min(filters.page * filters.page_size, count);

  return (
    <>
      <form
        role="search"
        onSubmit={submitFilters}
        className="rounded-2xl border border-line bg-surface p-4 shadow-e1 sm:p-6"
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Field label="Search schools and programmes">
            <span className="relative block">
              <Search aria-hidden className="absolute top-3.5 left-3 size-4 text-muted" />
              <input
                className={`${inputClass} pl-9`}
                type="search"
                placeholder="Programme, school, city"
                value={draft.q}
                onChange={(event) => changeDraft("q", event.target.value)}
              />
            </span>
          </Field>
          <Field label="Destination">
            <select
              className={inputClass}
              value={draft.country}
              onChange={(event) => changeDraft("country", event.target.value)}
            >
              <option value="">All destinations</option>
              {(filterOptions?.countries ?? []).map((country) => (
                <option key={country.code} value={country.code}>
                  {country.name} ({country.programme_count.toLocaleString("en")})
                </option>
              ))}
            </select>
          </Field>
          <Field label="Study level">
            <select
              className={inputClass}
              value={draft.level}
              onChange={(event) => changeDraft("level", event.target.value)}
            >
              <option value="">All levels</option>
              {(filterOptions?.levels ?? []).map((level) => (
                <option key={level.value} value={level.value}>
                  {level.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="School type">
            <select
              className={inputClass}
              value={draft.school_type}
              onChange={(event) => changeDraft("school_type", event.target.value)}
            >
              <option value="">All school types</option>
              {(filterOptions?.school_types ?? []).map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <details className="mt-4 border-t border-line pt-4">
          <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold text-accent [&::-webkit-details-marker]:hidden">
            <SlidersHorizontal aria-hidden className="size-4" />
            Tuition, location, duration and intake filters
          </summary>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <Field label="City">
              <input
                className={inputClass}
                value={draft.city}
                onChange={(event) => changeDraft("city", event.target.value)}
                placeholder="Any city"
              />
            </Field>
            <Field label="Tuition currency">
              <select
                className={inputClass}
                value={draft.currency}
                onChange={(event) => changeDraft("currency", event.target.value)}
              >
                <option value="">Any currency</option>
                {(filterOptions?.currencies ?? []).map((currency) => (
                  <option key={currency} value={currency}>
                    {currency}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Minimum tuition">
              <input
                className={inputClass}
                type="number"
                min="0"
                step="any"
                disabled={!draft.currency}
                value={draft.tuition_min}
                onChange={(event) => changeDraft("tuition_min", event.target.value)}
                placeholder="No minimum"
              />
            </Field>
            <Field label="Maximum tuition">
              <input
                className={inputClass}
                type="number"
                min="0"
                step="any"
                disabled={!draft.currency}
                value={draft.tuition_max}
                onChange={(event) => changeDraft("tuition_max", event.target.value)}
                placeholder="No maximum"
              />
            </Field>
            <Field label="Minimum duration (months)">
              <input
                className={inputClass}
                type="number"
                min="1"
                step="1"
                value={draft.duration_min}
                onChange={(event) => changeDraft("duration_min", event.target.value)}
                placeholder="Any duration"
              />
            </Field>
            <Field label="Maximum duration (months)">
              <input
                className={inputClass}
                type="number"
                min="1"
                step="1"
                value={draft.duration_max}
                onChange={(event) => changeDraft("duration_max", event.target.value)}
                placeholder="Any duration"
              />
            </Field>
            <Field label="Teaching language">
              <input
                className={inputClass}
                value={draft.language}
                onChange={(event) => changeDraft("language", event.target.value)}
                placeholder="e.g. English"
              />
            </Field>
            <Field label="Intake year">
              <input
                className={inputClass}
                type="number"
                min="1900"
                max={new Date().getFullYear() + 20}
                step="1"
                value={draft.intake_year}
                onChange={(event) => changeDraft("intake_year", event.target.value)}
                placeholder="e.g. 2027"
              />
            </Field>
            <Field label="Deadline on or after">
              <input
                className={inputClass}
                type="date"
                value={draft.deadline_after}
                onChange={(event) => changeDraft("deadline_after", event.target.value)}
              />
            </Field>
            <Field label="Deadline on or before">
              <input
                className={inputClass}
                type="date"
                value={draft.deadline_before}
                onChange={(event) => changeDraft("deadline_before", event.target.value)}
              />
            </Field>
            <Field label="Sort results">
              <span className="relative block">
                <ArrowDownWideNarrow
                  aria-hidden
                  className="absolute top-3.5 left-3 size-4 text-muted"
                />
                <select
                  className={`${inputClass} pl-9`}
                  value={draft.ordering}
                  onChange={(event) => changeDraft("ordering", event.target.value)}
                >
                  {SORT_OPTIONS.map((option) => (
                    <option
                      key={option.value}
                      value={option.value}
                      disabled={option.value.includes("tuition_amount") && !draft.currency}
                    >
                      {option.label}
                      {option.value.includes("tuition_amount") && !draft.currency
                        ? " (select currency first)"
                        : ""}
                    </option>
                  ))}
                </select>
              </span>
            </Field>
          </div>
          {!draft.currency && (
            <p className="mt-3 text-xs text-subtle">
              Tuition ranges and tuition sorting apply within the selected currency. Avoid comparing
              amounts in different currencies.
            </p>
          )}
        </details>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <p className="text-sm text-muted" role="status">
            Filters apply automatically as you change them.
          </p>
          <button type="button" onClick={clearFilters} className={buttonClasses("tertiary", "md")}>
            Clear all
          </button>
          <label className="ml-auto flex items-center gap-2 text-sm text-muted">
            Results per page
            <select
              className={`${inputClass} h-10 w-24`}
              value={draft.page_size}
              onChange={(event) => changeDraft("page_size", Number(event.target.value))}
            >
              <option value={24}>24</option>
              <option value={48}>48</option>
            </select>
          </label>
        </div>
      </form>

      {filterOptionsError && (
        <p role="status" className="mt-3 flex flex-wrap items-center gap-2 text-sm text-muted">
          Some filter choices could not be loaded.
          <button
            type="button"
            onClick={() => {
              setFilterOptionsError("");
              setRetryOptions((current) => current + 1);
            }}
            className="font-semibold text-accent underline"
          >
            Try again
          </button>
        </p>
      )}

      <section aria-label="Programme search results" className="mt-8">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl font-bold text-ink">{resultsTitle}</h2>
            {pageData && (
              <p className="mt-1 text-sm text-muted" role="status" aria-live="polite">
                {count.toLocaleString("en")} {itemNoun} · Showing {firstResult.toLocaleString("en")}
                –{lastResult.toLocaleString("en")}
                {loading ? " · Updating results…" : ""}
              </p>
            )}
          </div>
        </div>

        {error && (
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-surface p-4 text-sm text-muted">
            <p>Programme results could not be loaded. A notification has been sent.</p>
            <button
              type="button"
              onClick={() => setRetry((current) => current + 1)}
              className={buttonClasses("secondary", "sm")}
            >
              <RefreshCw aria-hidden className="size-4" /> Try again
            </button>
          </div>
        )}

        {!pageData && loading ? (
          <CatalogueSkeleton />
        ) : pageData && pageData.results.length ? (
          <div
            className="grid items-stretch gap-5 md:grid-cols-2 xl:grid-cols-3"
            aria-busy={loading}
            aria-label="School and programme cards"
          >
            {pageData.results.map((programme) => (
              <div key={programme.id} className="h-full">
                {renderCard(programme)}
              </div>
            ))}
          </div>
        ) : !error ? (
          <div className="rounded-2xl border border-dashed border-line bg-surface px-6 py-14 text-center">
            <GraduationCap aria-hidden className="mx-auto size-10 text-muted" />
            <h3 className="mt-3 font-display text-xl font-bold text-ink">No programmes found</h3>
            <p className="mt-2 text-sm text-muted">
              Try a different search or remove one or more filters.
            </p>
            <button
              type="button"
              onClick={clearFilters}
              className={buttonClasses("secondary", "sm", "mt-5")}
            >
              Clear filters
            </button>
          </div>
        ) : null}

        {pageData && totalPages > 1 && (
          <nav
            aria-label="Programme result pages"
            className="mt-8 flex flex-wrap items-center justify-center gap-3"
          >
            <button
              type="button"
              disabled={filters.page <= 1 || loading}
              onClick={() => navigate({ ...filters, page: filters.page - 1 })}
              className={buttonClasses("secondary", "sm")}
            >
              Previous
            </button>
            <span className="px-2 text-sm text-muted" aria-live="polite">
              Page {filters.page} of {totalPages.toLocaleString("en")}
            </span>
            <button
              type="button"
              disabled={filters.page >= totalPages || loading}
              onClick={() => navigate({ ...filters, page: filters.page + 1 })}
              className={buttonClasses("secondary", "sm")}
            >
              Next
            </button>
          </nav>
        )}
      </section>
    </>
  );
}
