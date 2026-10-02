"use client";

import { Award, GraduationCap, SlidersHorizontal } from "lucide-react";
import { useId, useState } from "react";
import { useMe } from "@/lib/ai/shell";
import {
  ADMISSIBLE_PILL,
  DEFAULT_STUDY_FILTERS,
  filterChips,
  INTAKE_WITHIN_OPTIONS,
  STUDY_LEVEL_LABEL,
  STUDY_LEVELS,
  type StudyFilters,
  type StudySort,
  useMyGrade,
  useProgrammes,
} from "@/lib/ai/study";
import { Button, ButtonLink } from "../Button";
import { Chip } from "../Chip";
import { Switch } from "../choice";
import { COUNTRY_NAMES } from "../Flag";
import { ProgrammeCard } from "../evidence/cards";
import { EmptyState, InlineAlert, Skeleton } from "../feedback";
import { TextField } from "../fields";
import { Select } from "../Select";

const SORTS: { value: StudySort; label: string }[] = [
  { value: "cost_after_scholarships", label: "Lowest cost after scholarships" },
  { value: "cost", label: "Lowest cost" },
  { value: "deadline", label: "Soonest deadline" },
  { value: "name", label: "Name" },
];

const INTAKE_OPTIONS = [
  { value: "", label: "Any time" },
  ...INTAKE_WITHIN_OPTIONS.map((days) => ({ value: String(days), label: `Within ${days} days` })),
];

/** How your degree result converts, shown once above the results (principle A4). */
function GradeBanner() {
  const grade = useMyGrade();
  const converted = grade.data?.converted;
  if (!converted) return null;
  return (
    <div className="mb-4 rounded-r-md border border-info-line bg-info-bg p-4 text-body-s text-info">
      <p className="font-semibold">
        Your {converted.as_written || "degree"} converts to{" "}
        {converted.uk_class_label ?? converted.uk_class ?? "an equivalent grade"}
        {converted.german_grade && ` · German grade ${converted.german_grade}`}.
      </p>
      {converted.indicative && <p className="mt-1">{converted.working}</p>}
    </div>
  );
}

/** /ai/study (web.md §10.1): programmes you can get into, by total cost. */
export function ProgrammeSearchView() {
  const me = useMe();
  const panelId = useId();
  const [draft, setDraft] = useState("");
  const [filters, setFilters] = useState<StudyFilters>(DEFAULT_STUDY_FILTERS);
  const [moreOpen, setMoreOpen] = useState(false);
  const [page, setPage] = useState(1);
  const programmes = useProgrammes(filters, page);

  const country = me.data?.destination
    ? (COUNTRY_NAMES[me.data.destination] ?? me.data.destination)
    : "";
  const chips = filterChips(filters);

  function update(changes: Partial<StudyFilters>) {
    setFilters((current) => ({ ...current, ...changes }));
    setPage(1);
  }

  function submitSearch(event: React.FormEvent) {
    event.preventDefault();
    update({ q: draft });
  }

  const data = programmes.data;
  const totalPages = data ? Math.max(1, Math.ceil(data.count / data.page_size)) : 1;

  return (
    <>
      <header className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-overline text-muted uppercase">Study</p>
          <h1 className="mt-1 font-display text-h1 text-ink">
            {country ? `Programmes you can get into in ${country}` : "Programmes you can get into"}
          </h1>
          <p className="mt-2 text-body text-muted">
            Ranked by total cost after scholarships, not by who pays us.
          </p>
        </div>
        <ButtonLink
          href="/ai/study/scholarships"
          size="sm"
          icon={<Award aria-hidden className="size-4" />}
        >
          Scholarships
        </ButtonLink>
      </header>

      <GradeBanner />

      <form
        role="search"
        onSubmit={submitSearch}
        className="space-y-3 rounded-r-md border border-line bg-surface p-4"
      >
        <TextField
          label="Search programmes"
          hideLabel
          type="search"
          placeholder="Search programme or subject"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
        />
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <Select
            label="Level"
            options={[
              { value: "", label: "Any level" },
              ...STUDY_LEVELS.map((level) => ({ value: level, label: STUDY_LEVEL_LABEL[level] })),
            ]}
            value={filters.level}
            onChange={(event) => update({ level: event.target.value as StudyFilters["level"] })}
            className="w-48"
          />
          <Select
            label="Sort"
            options={SORTS}
            value={filters.sort}
            onChange={(event) => update({ sort: event.target.value as StudySort })}
            className="w-56"
          />
          <Switch
            label="Include programmes you're not admissible for"
            checked={filters.includeNotAdmissible}
            onChange={(includeNotAdmissible) => update({ includeNotAdmissible })}
          />
        </div>

        {moreOpen && (
          <div
            id={panelId}
            className="grid gap-x-6 gap-y-3 border-t border-line pt-3 sm:grid-cols-2"
          >
            <TextField
              label="Subject"
              value={filters.subject}
              onChange={(event) => update({ subject: event.target.value })}
            />
            <TextField
              label="City"
              value={filters.city}
              onChange={(event) => update({ city: event.target.value })}
            />
            <TextField
              label="Language of instruction"
              helper="e.g. en, de"
              value={filters.language}
              onChange={(event) => update({ language: event.target.value })}
            />
            <TextField
              label="Total cost under (₦)"
              type="number"
              min={0}
              value={filters.tuitionMax ?? ""}
              onChange={(event) =>
                update({ tuitionMax: event.target.value ? Number(event.target.value) : null })
              }
            />
            <Select
              label="Next intake deadline"
              options={INTAKE_OPTIONS}
              value={filters.intakeWithin ? String(filters.intakeWithin) : ""}
              onChange={(event) =>
                update({ intakeWithin: event.target.value ? Number(event.target.value) : null })
              }
            />
            <Switch
              label="Leads to post-study work"
              checked={filters.postStudyWork}
              onChange={(postStudyWork) => update({ postStudyWork })}
            />
            <Switch
              label="A scholarship you could hold"
              checked={filters.hasScholarships}
              onChange={(hasScholarships) => update({ hasScholarships })}
            />
          </div>
        )}

        <Button
          type="button"
          variant="tertiary"
          size="sm"
          aria-expanded={moreOpen}
          aria-controls={moreOpen ? panelId : undefined}
          icon={<SlidersHorizontal aria-hidden className="size-4" />}
          onClick={() => setMoreOpen(!moreOpen)}
        >
          {moreOpen ? "Fewer filters" : "More filters"}
          {chips.length > 0 && ` (${chips.length})`}
        </Button>
      </form>

      {chips.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <h2 className="sr-only">Filters applied</h2>
          {chips.map((chip) => (
            <Chip key={chip.key} onRemove={() => update(chip.clear)}>
              {chip.label}
            </Chip>
          ))}
        </div>
      )}

      <p role="status" className="mt-4 mb-3 text-body-s text-muted">
        {data && (
          <>
            <span className="font-semibold text-ink tabular-nums">
              {data.count.toLocaleString("en-GB")}
            </span>{" "}
            programme{data.count === 1 ? "" : "s"}
            {!filters.includeNotAdmissible && data.not_shown.not_admissible > 0 && (
              <> · {data.not_shown.not_admissible} hidden (not admissible)</>
            )}
          </>
        )}
      </p>

      {programmes.isPending ? (
        <div className="space-y-3" aria-busy="true" aria-label="Loading programmes">
          <Skeleton className="h-44 w-full" />
          <Skeleton className="h-44 w-full" />
        </div>
      ) : programmes.isError ? (
        <InlineAlert
          tone="danger"
          title="We couldn't load programmes."
          action={
            <Button size="sm" variant="secondary" onClick={() => void programmes.refetch()}>
              Try again
            </Button>
          }
        />
      ) : !data?.results.length ? (
        <EmptyState icon={<GraduationCap />} title="No programmes match">
          Try a different level, or include programmes you&apos;re not admissible for yet.
        </EmptyState>
      ) : (
        <>
          <h2 className="sr-only">Results</h2>
          <ol className="space-y-3" aria-label="Programmes">
            {data.results.map((programme) => (
              <li key={programme.id}>
                <ProgrammeCard
                  name={programme.name}
                  institution={programme.institution.name}
                  city={programme.institution.city}
                  totalNaira={Number(programme.cost.after_scholarships_ngn)}
                  admissible={ADMISSIBLE_PILL[programme.admissibility]}
                  deadline={programme.next_intake?.deadline ?? undefined}
                  postStudyWork={programme.flags.post_study_work ?? false}
                  href={`/ai/study/${programme.id}`}
                />
              </li>
            ))}
          </ol>
          {totalPages > 1 && (
            <nav aria-label="Pages" className="mt-6 flex items-center justify-between gap-3">
              <Button
                variant="secondary"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </Button>
              <span className="text-body-s text-muted tabular-nums">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="secondary"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
              >
                Next
              </Button>
            </nav>
          )}
        </>
      )}
    </>
  );
}
