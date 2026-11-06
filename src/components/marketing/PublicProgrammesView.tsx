"use client";

import Link from "next/link";
import { ArrowRight, CalendarDays, Clock3, ExternalLink, MapPin } from "lucide-react";
import { buttonClasses } from "@/components/ui/buttonStyles";
import { ProgrammeCatalogue } from "./ProgrammeCatalogue";
import { type PublicProgramme } from "@/lib/public-programmes";

const LEVEL_LABELS: Record<string, string> = {
  foundation: "Foundation / pathway",
  undergraduate: "Undergraduate",
  postgraduate: "Postgraduate",
  doctorate: "Doctorate",
  secondary: "Secondary school",
  language: "Language course",
};

const TAG_LABELS: Record<string, string> = {
  high_job_availability: "High job demand",
  scholarships_available: "Scholarships available",
  popular_programs: "Popular",
  fast_loa: "Fast acceptance",
};

function formatAmount(amount: number | string | null, currency: string) {
  if (amount === null || amount === "") return "Not listed";
  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount)) return "Not listed";
  if (!currency) return numericAmount.toLocaleString("en");
  try {
    return new Intl.NumberFormat("en", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(numericAmount);
  } catch {
    return `${numericAmount.toLocaleString("en")} ${currency}`;
  }
}

function formatDate(value: string | null) {
  if (!value) return null;
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("en", { day: "numeric", month: "short", year: "numeric" }).format(
        date,
      );
}

function formatIntake(value: string) {
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  if (!Number.isNaN(date.getTime()) && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    return new Intl.DateTimeFormat("en", { month: "short", year: "numeric" }).format(date);
  }
  return value;
}

function programmeDuration(programme: PublicProgramme) {
  const { min_length: minimum, max_length: maximum } = programme.applyboard;
  if (minimum && maximum) {
    return minimum === maximum ? `${minimum} months` : `${minimum}–${maximum} months`;
  }
  if (minimum) return `${minimum}+ months`;
  return programme.duration_months ? `${programme.duration_months} months` : "Not listed";
}

function successLabel(programme: PublicProgramme) {
  const score = programme.applyboard.success_score;
  if (typeof score === "string") return score;
  return score?.label ?? null;
}

function ProgrammeCard({ programme }: { programme: PublicProgramme }) {
  const { school, applyboard } = programme;
  const location = [school.city, school.province, school.country_name].filter(Boolean).join(", ");
  const intakes = [
    ...new Set(
      (applyboard.program_intakes ?? [])
        .map((intake) => intake.startDate)
        .filter((intake): intake is string => Boolean(intake)),
    ),
  ];
  const availableIntakes = intakes.length ? intakes : programme.intakes;
  const tags = [...new Set((applyboard.tags ?? []).map((tag) => TAG_LABELS[tag]).filter(Boolean))];
  const success = successLabel(programme);

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-e1 transition-shadow hover:shadow-e2">
      <div className="h-1.5 bg-accent" />
      <div className="flex flex-1 flex-col p-5 sm:p-6">
        <header className="flex min-w-0 items-center gap-3">
          <span className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-line bg-sunken font-display text-lg font-bold text-accent">
            {school.logo_url ? (
              // External institution logos cannot be passed through next/image without host configuration.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={school.logo_url}
                alt=""
                loading="lazy"
                className="size-full object-contain p-1"
              />
            ) : (
              school.name.charAt(0).toUpperCase()
            )}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-ink">{school.name}</p>
            <p className="mt-0.5 flex items-center gap-1 truncate text-sm text-muted">
              <MapPin aria-hidden className="size-3.5 shrink-0" />
              <span>{location || "Location not listed"}</span>
            </p>
          </div>
          {applyboard.application_enabled && (
            <span className="shrink-0 rounded-full bg-success-bg px-2.5 py-1 text-xs font-semibold text-success">
              ApplyBoard applications
            </span>
          )}
        </header>

        <div className="mt-5">
          <p className="text-sm font-semibold text-accent">
            {applyboard.program_level_label || LEVEL_LABELS[programme.level] || programme.level}
          </p>
          <h2 className="mt-1 font-display text-xl leading-snug font-bold text-ink">
            {programme.name}
          </h2>
          {school.description && (
            <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted">
              {school.description}
            </p>
          )}
        </div>

        {tags.length > 0 && (
          <ul aria-label="Programme highlights" className="mt-3 flex flex-wrap gap-2">
            {tags.map((tag) => (
              <li
                key={tag}
                className="rounded-full border border-line bg-sunken px-2.5 py-1 text-xs font-medium text-ink"
              >
                {tag}
              </li>
            ))}
          </ul>
        )}

        <dl className="mt-5 grid grid-cols-2 gap-3 rounded-xl bg-sunken p-4">
          <div>
            <dt className="text-xs text-muted">Tuition as listed</dt>
            <dd className="mt-1 font-display text-lg font-bold text-ink">
              {formatAmount(programme.tuition_amount, programme.tuition_currency)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Application fee</dt>
            <dd className="mt-1 font-semibold text-ink">
              {applyboard.application_fee === null || applyboard.application_fee === undefined
                ? "Not listed"
                : `${Number(applyboard.application_fee).toLocaleString("en")} (currency not specified)`}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Duration</dt>
            <dd className="mt-1 flex items-center gap-1.5 font-medium text-ink">
              <Clock3 aria-hidden className="size-4 text-muted" />
              {programmeDuration(programme)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Teaching language</dt>
            <dd className="mt-1 font-medium text-ink">
              {programme.language_of_instruction || "Not listed"}
            </dd>
          </div>
          {programme.application_deadline && (
            <div className="col-span-2 border-t border-line pt-3">
              <dt className="text-xs text-muted">Application deadline</dt>
              <dd className="mt-1 flex items-center gap-1.5 font-semibold text-ink">
                <CalendarDays aria-hidden className="size-4 text-muted" />
                {formatDate(programme.application_deadline)}
              </dd>
            </div>
          )}
          {success && (
            <div className="col-span-2 border-t border-line pt-3">
              <dt className="text-xs text-muted">ApplyBoard success indicator</dt>
              <dd className="mt-1 font-semibold text-ink">{success}</dd>
            </div>
          )}
        </dl>

        <div className="mt-4">
          <p className="text-xs font-semibold text-ink">
            {availableIntakes.length ? "Available intakes" : "Intakes"}
          </p>
          {availableIntakes.length ? (
            <ul className="mt-2 flex flex-wrap gap-2">
              {[...new Set(availableIntakes)].slice(0, 6).map((intake) => (
                <li
                  key={intake}
                  className="rounded-lg border border-line px-2.5 py-1 text-xs text-muted"
                >
                  {formatIntake(intake)}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-sm text-muted">Confirm intake availability with the school.</p>
          )}
        </div>

        <div className="mt-auto flex flex-wrap items-center gap-3 pt-5">
          <Link href="/ai/my-application/new" className={buttonClasses("primary", "sm", "flex-1")}>
            Start an application <ArrowRight aria-hidden className="size-4" />
          </Link>
          {school.website && (
            <a
              href={school.website}
              target="_blank"
              rel="noreferrer"
              className={buttonClasses("secondary", "sm")}
            >
              School website <ExternalLink aria-hidden className="size-3.5" />
            </a>
          )}
        </div>
      </div>
    </article>
  );
}

export function PublicProgrammesView() {
  return (
    <div className="bg-canvas">
      <main className="mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-10">
        <h1 className="font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
          Schools and programmes abroad
        </h1>
        <p className="mt-2 max-w-3xl text-body leading-relaxed text-muted">
          Compare tuition, intakes, deadlines and entry requirements across destinations, then
          shortlist the ones that fit your plan.
        </p>
        <div className="mt-6">
          <ProgrammeCatalogue
            basePath="/ai/programs"
            renderCard={(programme) => <ProgrammeCard programme={programme} />}
          />
        </div>

        <aside className="mt-10 rounded-xl border border-line bg-sunken p-4 text-sm leading-relaxed text-muted">
          <p className="font-semibold text-ink">Before you apply</p>
          <p className="mt-1">
            Tuition may be shown per year or per programme according to the source listing.
            Application-fee currency is not provided for every programme. Success indicators are not
            admission guarantees. Confirm cost, requirements, intake availability and deadlines with
            the school before making a decision.
          </p>
        </aside>
      </main>
    </div>
  );
}
