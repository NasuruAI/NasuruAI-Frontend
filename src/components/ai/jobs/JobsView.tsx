"use client";

import {
  Bell,
  BellPlus,
  Bookmark,
  BriefcaseBusiness,
  ExternalLink,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { useAnnouncer } from "@/components/ui/Announcer";
import { ApiError } from "@/lib/api";
import {
  checkRows,
  DEFAULT_FILTERS,
  filterChips,
  filtersFromSearch,
  type Job,
  type JobFilters,
  POSTED_WITHIN,
  postedLabel,
  SPONSOR_LABEL,
  type SponsorEvidence,
  searchFromFilters,
  useCreateSearch,
  useJob,
  useJobSearches,
  useJobs,
  useRequestPack,
  useSaveJob,
  useWorkRoutes,
} from "@/lib/ai/jobs";
import { useMe } from "@/lib/ai/shell";
import { Button, ButtonLink } from "../Button";
import { Chip } from "../Chip";
import { Switch } from "../choice";
import { cx } from "../cx";
import { Dialog } from "../Dialog";
import { JobCard } from "../evidence/cards";
import { CheckList, TrustMeter } from "../evidence/Trust";
import { EmptyState, InlineAlert, Skeleton } from "../feedback";
import { TextField } from "../fields";
import { COUNTRY_NAMES } from "../Flag";
import { Select } from "../Select";
import { ContextPanel, useIsXl } from "../shell/ContextPanel";
import { useToast } from "../Toast";
import { FitBreakdown, PrepareButton, SalaryText } from "./parts";

const SORTS = [
  { value: "fit", label: "Best fit" },
  { value: "recent", label: "Newest" },
  { value: "trust", label: "Most trusted" },
];

const POSTED_OPTIONS = [
  { value: "", label: "Any time" },
  ...POSTED_WITHIN.map((days) => ({ value: String(days), label: postedLabel(days) })),
];

const SPONSOR_OPTIONS = (Object.keys(SPONSOR_LABEL) as SponsorEvidence[]).map((value) => ({
  value,
  label: value === "any" ? "Any evidence" : SPONSOR_LABEL[value],
}));

/** True when a key press belongs to a text field, not to the page's shortcuts. */
function typing(target: EventTarget | null): boolean {
  const element = target as HTMLElement | null;
  if (!element) return false;
  return element.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(element.tagName);
}

function places(text: string): string[] {
  return text
    .split(",")
    .map((place) => place.trim())
    .filter(Boolean);
}

/** The selected job at xl: trust, fit and the way on, without leaving the list. */
function JobPreview({ id }: { id: string }) {
  const job = useJob(id);
  if (job.isPending) return <Skeleton className="h-64 w-full" />;
  if (job.isError) return <p className="text-body-s text-muted">We couldn&apos;t load this job.</p>;
  const data = job.data;
  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-display text-h3 text-ink">{data.title}</h3>
        <p className="text-body-s text-muted">
          {data.employer} · {data.location_text}
        </p>
        <p className="mt-2 text-body-s">
          <SalaryText job={data} />
        </p>
      </div>
      {data.trust_score !== null && <TrustMeter score={data.trust_score} />}
      <CheckList checks={checkRows(data.checks)} />
      <FitBreakdown fit={data.fit} />
      <div className="flex flex-wrap gap-2">
        <PrepareButton jobId={data.id} size="sm" />
        <ButtonLink
          href={`/ai/jobs/${data.id}`}
          size="sm"
          icon={<ExternalLink aria-hidden className="size-4" />}
        >
          Full details
        </ButtonLink>
      </div>
    </div>
  );
}

/** Name the search, choose alerts, save (web.md §7.1 "Save search → alert rule"). */
function SaveSearchDialog({
  filters,
  routeNames,
  onClose,
}: {
  filters: JobFilters;
  routeNames: Record<string, string>;
  onClose: () => void;
}) {
  const router = useRouter();
  const toast = useToast();
  const create = useCreateSearch();
  const chips = filterChips(filters, routeNames);
  const [name, setName] = useState(filters.q.trim() || chips[0]?.label || "My search");
  const [alerts, setAlerts] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function save() {
    if (!name.trim()) {
      setError("Give the search a name.");
      return;
    }
    setError(null);
    create.mutate(
      { name: name.trim(), filters: searchFromFilters(filters), alerts },
      {
        onSuccess: () => {
          onClose();
          toast({
            message: alerts ? "Search saved. Alerts follow it." : "Search saved",
            action: { label: "Manage", onClick: () => router.push("/ai/jobs/alerts") },
          });
        },
        onError: (err) =>
          setError(err instanceof ApiError ? err.message : "That didn't save. Try again."),
      },
    );
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title="Save this search"
      description={
        chips.length
          ? `Filters: ${chips.map((chip) => chip.label).join(" · ")}`
          : "Every verified job in your destination."
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={create.isPending} onClick={save}>
            Save search
          </Button>
        </>
      }
    >
      <div className="space-y-3 pb-2">
        {error && <InlineAlert tone="danger" title={error} />}
        <TextField
          label="Name"
          maxLength={80}
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <Switch
          label="Send me alerts for new jobs like these"
          description="In your daily job digest. With any search alerting, the digest follows only those."
          checked={alerts}
          onChange={setAlerts}
        />
      </div>
    </Dialog>
  );
}

/** /ai/jobs (web.md §7.1). `searchId` opens a saved search; `initialSort` comes from links. */
export function JobsView({
  searchId,
  initialSort,
}: {
  searchId?: string;
  initialSort?: JobFilters["sort"];
} = {}) {
  const router = useRouter();
  const me = useMe();
  const { announce } = useAnnouncer();
  const isXl = useIsXl();
  const panelId = useId();
  const [draft, setDraft] = useState("");
  const [placesDraft, setPlacesDraft] = useState("");
  const [filters, setFilters] = useState<JobFilters>({
    ...DEFAULT_FILTERS,
    sort: initialSort ?? DEFAULT_FILTERS.sort,
  });
  const [moreOpen, setMoreOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(0);
  const [packError, setPackError] = useState<ApiError | null>(null);
  const jobs = useJobs(filters, page);
  const save = useSaveJob();
  const request = useRequestPack();
  const routes = useWorkRoutes(me.data?.destination);
  const searches = useJobSearches();
  const opened = useRef<string | null>(null);
  const search = useRef<HTMLInputElement>(null);
  const items = useRef<Array<HTMLLIElement | null>>([]);

  const results = jobs.data?.results ?? [];
  const current: Job | undefined = results[Math.min(selected, results.length - 1)];
  const country = me.data?.destination
    ? (COUNTRY_NAMES[me.data.destination] ?? me.data.destination)
    : "";
  const routeNames = Object.fromEntries(
    (routes.data ?? []).map((route) => [route.code, route.name]),
  );
  const chips = filterChips(filters, routeNames).filter(
    (chip) => chip.key !== "q" && chip.key !== "remote",
  );

  // A saved search opened from the alerts page: its filters, once.
  useEffect(() => {
    const saved = searches.data?.find((item) => item.id === searchId);
    if (!saved || opened.current === saved.id) return;
    opened.current = saved.id;
    const next = filtersFromSearch(saved);
    setFilters((current) => ({
      ...next,
      sort: current.sort,
      include_caution: current.include_caution,
    }));
    setDraft(next.q);
    setPlacesDraft(next.cities.join(", "));
    setMoreOpen(filterChips(next).some((chip) => chip.key !== "q" && chip.key !== "remote"));
    setPage(1);
    setSelected(0);
  }, [searches.data, searchId]);

  // Typing in the search and places boxes applies after a pause, not on every key.
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters((current) => (current.q === draft ? current : { ...current, q: draft }));
      setPage(1);
      setSelected(0);
    }, 400);
    return () => clearTimeout(timer);
  }, [draft]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const cities = places(placesDraft);
      setFilters((current) =>
        current.cities.join("|") === cities.join("|") ? current : { ...current, cities },
      );
      setPage(1);
      setSelected(0);
    }, 400);
    return () => clearTimeout(timer);
  }, [placesDraft]);

  function update(changes: Partial<JobFilters>) {
    setFilters((current) => ({ ...current, ...changes }));
    if (changes.q !== undefined) setDraft(changes.q);
    if (changes.cities !== undefined) setPlacesDraft(changes.cities.join(", "));
    setPage(1);
    setSelected(0);
  }

  function clearFilters() {
    update({
      cities: [],
      route: "",
      meets_salary_threshold: false,
      language: "any",
      posted_within: null,
      sponsor: "any",
    });
    announce("Filters cleared");
  }

  function prepare(job: Job) {
    setPackError(null);
    request.mutate(job.id, {
      onSuccess: (pack) => router.push(`/ai/packs/${pack.id}`),
      onError: (err) =>
        setPackError(err instanceof ApiError ? err : new ApiError("That didn't work.", 0)),
    });
  }

  function toggleSave(job: Job) {
    save.mutate({ id: job.id, saved: !job.saved });
    announce(job.saved ? `Removed ${job.title} from saved jobs` : `Saved ${job.title}`);
  }

  // Keyboard: j/k move, s save, p prepare answers, / search (web.md §7.1).
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey || typing(event.target)) return;
      if (event.key === "/") {
        event.preventDefault();
        search.current?.focus();
        return;
      }
      if (!results.length) return;
      if (event.key === "j" || event.key === "k") {
        event.preventDefault();
        const next = Math.max(
          0,
          Math.min(results.length - 1, selected + (event.key === "j" ? 1 : -1)),
        );
        setSelected(next);
        items.current[next]?.scrollIntoView({ block: "nearest" });
        announce(`${results[next].title}, ${results[next].employer}`);
      } else if (event.key === "s" && current) {
        event.preventDefault();
        toggleSave(current);
      } else if (event.key === "p" && current) {
        event.preventDefault();
        prepare(current);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const totalPages = jobs.data ? Math.max(1, Math.ceil(jobs.data.count / jobs.data.page_size)) : 1;

  return (
    <>
      <header className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-overline text-muted uppercase">Jobs</p>
          <h1 className="mt-1 font-display text-h1 text-ink">
            {country ? `Verified jobs in ${country}` : "Verified jobs"}
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <ButtonLink
            href="/ai/jobs/saved"
            size="sm"
            icon={<Bookmark aria-hidden className="size-4" />}
          >
            Saved
          </ButtonLink>
          <ButtonLink
            href="/ai/jobs/alerts"
            size="sm"
            icon={<Bell aria-hidden className="size-4" />}
          >
            Alerts
          </ButtonLink>
        </div>
      </header>

      <form
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          update({ q: draft, cities: places(placesDraft) });
        }}
        className="space-y-3 rounded-r-md border border-line bg-surface p-4"
      >
        <TextField
          ref={search}
          label="Search job titles"
          hideLabel
          type="search"
          placeholder="Search job titles, e.g. data analyst  ( / )"
          leading={<Search aria-hidden className="size-4" />}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
        />
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <Switch
            label="Remote only"
            checked={filters.remote}
            onChange={(remote) => update({ remote })}
          />
          <Switch
            label="Include caution jobs"
            description="Trust 40–59, shown with their warnings"
            checked={filters.include_caution}
            onChange={(include_caution) => update({ include_caution })}
          />
          <Select
            label="Sort"
            options={SORTS}
            value={filters.sort}
            onChange={(event) => update({ sort: event.target.value as JobFilters["sort"] })}
            className="w-44"
          />
        </div>

        {moreOpen && (
          <div
            id={panelId}
            className="grid gap-x-6 gap-y-3 border-t border-line pt-3 sm:grid-cols-2"
          >
            <TextField
              label="Places"
              helper="A city or region. Separate several with commas."
              value={placesDraft}
              onChange={(event) => setPlacesDraft(event.target.value)}
            />
            <Select
              label="Visa route"
              helper="Jobs that meet the route's salary rule, where we check it."
              options={[
                { value: "", label: "Any route" },
                ...(routes.data ?? []).map((route) => ({ value: route.code, label: route.name })),
              ]}
              value={filters.route}
              onChange={(event) => update({ route: event.target.value })}
            />
            <Select
              label="Posted"
              options={POSTED_OPTIONS}
              value={filters.posted_within ? String(filters.posted_within) : ""}
              onChange={(event) =>
                update({ posted_within: event.target.value ? Number(event.target.value) : null })
              }
            />
            <Select
              label="Sponsor evidence"
              options={SPONSOR_OPTIONS}
              value={filters.sponsor}
              onChange={(event) => update({ sponsor: event.target.value as SponsorEvidence })}
            />
            <Switch
              label="Meets the visa salary threshold"
              description="The salary passed our threshold check"
              checked={filters.meets_salary_threshold}
              onChange={(meets_salary_threshold) => update({ meets_salary_threshold })}
            />
            <Switch
              label="English-speaking jobs only"
              description="Leaves out jobs that ask for German"
              checked={filters.language === "english"}
              onChange={(english) => update({ language: english ? "english" : "any" })}
            />
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2">
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
          <Button
            type="button"
            variant="secondary"
            size="sm"
            icon={<BellPlus aria-hidden className="size-4" />}
            onClick={() => setSaving(true)}
          >
            Save this search
          </Button>
        </div>
      </form>

      {chips.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <h2 className="sr-only">Filters applied</h2>
          {chips.map((chip) => (
            <Chip key={chip.key} onRemove={() => update(chip.clear)}>
              {chip.label}
            </Chip>
          ))}
          <button
            type="button"
            onClick={clearFilters}
            className="text-body-s font-semibold text-accent underline underline-offset-3"
          >
            Clear filters
          </button>
        </div>
      )}

      {saving && (
        <SaveSearchDialog
          filters={filters}
          routeNames={routeNames}
          onClose={() => setSaving(false)}
        />
      )}

      {packError &&
        (packError.status === 402 ? (
          <InlineAlert
            tone="warning"
            title="You've used this month's free answer packs"
            className="mt-4"
            action={
              <Link
                href="/ai/billing"
                className="font-semibold text-accent underline underline-offset-3"
              >
                See plans
              </Link>
            }
          >
            {packError.message}
          </InlineAlert>
        ) : (
          <InlineAlert tone="danger" title={packError.message} className="mt-4" />
        ))}

      <p role="status" className="mt-4 mb-3 text-body-s text-muted">
        {jobs.data && (
          <>
            <span className="font-semibold text-ink tabular-nums">
              {jobs.data.count.toLocaleString("en-GB")}
            </span>{" "}
            verified job{jobs.data.count === 1 ? "" : "s"}
            {jobs.data.explanation && <> · {jobs.data.explanation}</>}{" "}
            <Link href="/ai/how-ranking-works" className="text-accent underline underline-offset-3">
              How ranking works
            </Link>
          </>
        )}
      </p>

      {jobs.isPending ? (
        <div className="space-y-3" aria-busy="true" aria-label="Loading jobs">
          <Skeleton className="h-44 w-full" />
          <Skeleton className="h-44 w-full" />
        </div>
      ) : jobs.isError ? (
        <InlineAlert
          tone="danger"
          title={
            jobs.error instanceof ApiError && jobs.error.code === "no_destination"
              ? "Choose a destination to see its jobs."
              : "We couldn't load jobs."
          }
          action={
            <Button size="sm" variant="secondary" onClick={() => void jobs.refetch()}>
              Try again
            </Button>
          }
        />
      ) : !results.length ? (
        <EmptyState icon={<BriefcaseBusiness />} title="No verified jobs match">
          {filters.q || filters.remote || chips.length
            ? "Try fewer words, or remove a filter."
            : "New jobs are checked every day. Turn on alerts and we'll tell you when one fits."}
        </EmptyState>
      ) : (
        <>
          <p className="sr-only">
            Keyboard: j and k move, s saves, p prepares answers, slash searches.
          </p>
          <h2 className="sr-only">Results</h2>
          <ol className="space-y-3" aria-label="Jobs">
            {results.map((job, index) => (
              <li
                key={job.id}
                ref={(element) => {
                  items.current[index] = element;
                }}
                aria-current={index === selected ? "true" : undefined}
                onFocusCapture={() => setSelected(index)}
                className={cx("rounded-r-md", index === selected && "ring-2 ring-accent")}
              >
                <JobCard
                  title={job.title}
                  employer={job.employer}
                  location={job.remote ? `${job.location_text} · remote` : job.location_text}
                  salaryLine={<SalaryText job={job} />}
                  trust={job.trust_score ?? 0}
                  fit={job.fit}
                  postedAt={job.posted_at ?? undefined}
                  saved={job.saved}
                  href={`/ai/jobs/${job.id}`}
                  onSave={() => toggleSave(job)}
                  onPrepare={() => prepare(job)}
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
                onClick={() => {
                  setPage(page - 1);
                  setSelected(0);
                }}
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
                onClick={() => {
                  setPage(page + 1);
                  setSelected(0);
                }}
              >
                Next
              </Button>
            </nav>
          )}
        </>
      )}

      {isXl && current && (
        <ContextPanel title="Job preview" open={false} onClose={() => undefined}>
          <JobPreview id={current.id} />
        </ContextPanel>
      )}
    </>
  );
}
