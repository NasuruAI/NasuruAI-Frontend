/**
 * Composite cards (design-system §8.3). Presentational: feature modules map
 * API data onto these props.
 */

import {
  BadgeCheck,
  Bookmark,
  BookmarkCheck,
  Building2,
  CalendarDays,
  CalendarClock,
  Check,
  FileCheck2,
  FileText,
  Flag as FlagIcon,
  Heart,
  Home,
  MapPin,
  Pencil,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button, ButtonLink } from "../Button";
import { Pill } from "../Chip";
import { cx } from "../cx";
import { daysBetween, formatDate, formatNaira } from "./format";
import { type Foreign, MoneyText } from "./Money";
import { Timeline, type TimelineStep } from "./Progress";
import { SourceLine, type Source } from "./Source";
import { CountdownChip, type StatusKind, StatusPill } from "./Status";
import { FitScore, TrustMeter } from "./Trust";

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <article
      className={cx(
        "rounded-r-lg border border-line bg-surface p-5 shadow-e1 transition-[border-color,box-shadow,transform] duration-m-fast hover:-translate-y-0.5 hover:border-brand-blue-soft hover:shadow-e2",
        className,
      )}
    >
      {children}
    </article>
  );
}

/** A title that links to the detail page. */
function Title({ href, children }: { href?: string; children: React.ReactNode }) {
  return (
    <h3 className="font-display text-h3 text-balance text-ink">
      {href ? (
        <Link href={href} className="hover:underline hover:underline-offset-3">
          {children}
        </Link>
      ) : (
        children
      )}
    </h3>
  );
}

export function RouteCard({
  name,
  status,
  topLine,
  months,
  naira,
  source,
  href,
  onAddToPlan,
}: {
  name: string;
  status: Exclude<StatusKind, "stale" | "you_answer">;
  /** The top gap ("Needs IELTS 6.5") or the top reason. */
  topLine: string;
  months?: number;
  naira?: number;
  source?: Source;
  href: string;
  onAddToPlan?: () => void;
}) {
  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <Title href={href}>{name}</Title>
        <StatusPill status={status} />
      </div>
      <p className="mt-2 text-body text-ink">{topLine}</p>
      {(months !== undefined || naira !== undefined) && (
        <p className="mt-2 text-body-s text-muted tabular-nums">
          {[
            months !== undefined ? `about ${months} months` : null,
            naira !== undefined ? formatNaira(naira, { short: true }) : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
      )}
      {source && <SourceLine source={source} className="mt-2" />}
      <div className="mt-4 flex flex-wrap gap-2">
        <ButtonLink href={href} size="sm">
          See details
        </ButtonLink>
        {onAddToPlan && (
          <Button size="sm" variant="secondary" onClick={onAddToPlan}>
            Add to plan
          </Button>
        )}
      </div>
    </Card>
  );
}

export function PathwayCard({
  rank,
  title,
  steps,
  naira,
  months,
  leadsToPr,
  probability,
  onChoose,
  chosen = false,
}: {
  rank: number;
  title: string;
  steps: TimelineStep[];
  /** null: not priced yet. */
  naira: number | null;
  months: number;
  leadsToPr: boolean;
  probability: "high" | "medium" | "low";
  onChoose?: () => void;
  chosen?: boolean;
}) {
  return (
    <Card className={cx(chosen && "border-line-strong")}>
      <p className="text-overline text-muted uppercase">Pathway {rank}</p>
      <Title>{title}</Title>
      <div className="mt-3">
        <Timeline steps={steps} orientation="horizontal" />
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div>
          <dt className="text-caption text-muted">Total</dt>
          <dd className="text-metric-s tabular-nums text-ink">
            {naira === null ? "Not priced yet" : formatNaira(naira, { short: true })}
          </dd>
        </div>
        <div>
          <dt className="text-caption text-muted">Time</dt>
          <dd className="text-metric-s tabular-nums text-ink">{months} months</dd>
        </div>
        <div>
          <dt className="text-caption text-muted">Permanent residence</dt>
          <dd className="text-metric-s text-ink">{leadsToPr ? "Yes" : "No"}</dd>
        </div>
        <div>
          <dt className="text-caption text-muted">Likelihood</dt>
          <dd className="text-metric-s text-ink capitalize">{probability}</dd>
        </div>
      </dl>
      {onChoose && (
        <div className="mt-4">
          {chosen ? (
            <p className="flex items-center gap-1.5 text-body-s font-semibold text-success">
              <Check aria-hidden className="size-4" /> Your plan
            </p>
          ) : (
            <Button size="sm" onClick={onChoose}>
              Make this my plan
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}

function SaveButton({
  saved,
  onSave,
  what,
}: {
  saved: boolean;
  onSave?: () => void;
  what: string;
}) {
  if (!onSave) return null;
  const Icon = saved ? BookmarkCheck : Bookmark;
  return (
    <button
      type="button"
      aria-pressed={saved}
      aria-label={saved ? `Saved: ${what}` : `Save ${what}`}
      onClick={onSave}
      className={cx(
        "flex size-11 shrink-0 items-center justify-center rounded-r-md hover:bg-sunken",
        saved ? "text-accent" : "text-muted",
      )}
    >
      <Icon aria-hidden className="size-5" />
    </button>
  );
}

function Logo({ name, src }: { name: string; src?: string }) {
  return (
    <span className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-r-sm bg-sunken font-display text-body-s font-semibold text-muted">
      {src ? (
        // A company logo from its own domain: next/image would need every host allow-listed.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" loading="lazy" className="size-full object-contain" />
      ) : (
        name.charAt(0).toUpperCase()
      )}
    </span>
  );
}

export function JobCard({
  title,
  employer,
  logo,
  location,
  salary,
  salaryLine,
  trust,
  fit,
  postedAt,
  sponsorLicensed,
  saved = false,
  href,
  onSave,
  onPrepare,
}: {
  title: string;
  employer: string;
  logo?: string;
  location: string;
  salary?: { naira: number; foreign?: Foreign };
  /** A ready-made salary line (a range, or a foreign amount with no rate yet); wins over `salary`. */
  salaryLine?: React.ReactNode;
  trust: number;
  fit?: { score: number; reasons: string[] };
  postedAt?: string;
  sponsorLicensed?: boolean;
  saved?: boolean;
  href: string;
  onSave?: () => void;
  onPrepare?: () => void;
}) {
  const days = postedAt ? -daysBetween(postedAt) : null;
  return (
    <Card>
      <div className="flex items-start gap-3">
        <Logo name={employer} src={logo} />
        <div className="min-w-0 flex-1">
          <Title href={href}>{title}</Title>
          <p className="text-body-s text-muted">
            {employer} · <MapPin aria-hidden className="inline size-3.5 align-[-2px]" /> {location}
          </p>
        </div>
        <SaveButton saved={saved} onSave={onSave} what={title} />
      </div>
      {salaryLine ? (
        <p className="mt-2 text-body">{salaryLine}</p>
      ) : (
        salary && (
          <p className="mt-2 text-body">
            <MoneyText naira={salary.naira} foreign={salary.foreign} short />
          </p>
        )
      )}
      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
        <TrustMeter score={trust} compact />
        {sponsorLicensed && (
          <Pill tone="success" icon={<BadgeCheck aria-hidden className="size-3.5" />}>
            Sponsor licence
          </Pill>
        )}
        {days !== null && (
          <span className="text-caption text-subtle">
            {days <= 0 ? "Posted today" : `Posted ${days} day${days === 1 ? "" : "s"} ago`}
          </span>
        )}
      </div>
      {fit && (
        <div className="mt-3">
          <FitScore score={fit.score} reasons={fit.reasons} />
        </div>
      )}
      {onPrepare && (
        <div className="mt-4">
          <Button size="sm" onClick={onPrepare}>
            Prepare answers
          </Button>
        </div>
      )}
    </Card>
  );
}

export function ProgrammeCard({
  name,
  institution,
  city,
  totalNaira,
  admissible,
  deadline,
  postStudyWork,
  saved = false,
  href,
  onSave,
}: {
  name: string;
  institution: string;
  city: string;
  totalNaira: number;
  admissible: "yes" | "if" | "no";
  deadline?: string;
  postStudyWork?: boolean;
  saved?: boolean;
  href: string;
  onSave?: () => void;
}) {
  const pill = { yes: "eligible", if: "eligible_if", no: "not_eligible" } as const;
  return (
    <Card>
      <div className="flex items-start gap-3">
        <Building2 aria-hidden className="mt-1 size-5 shrink-0 text-muted" />
        <div className="min-w-0 flex-1">
          <Title href={href}>{name}</Title>
          <p className="text-body-s text-muted">
            {institution} · {city}
          </p>
        </div>
        <SaveButton saved={saved} onSave={onSave} what={name} />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <StatusPill status={pill[admissible]} />
        {postStudyWork && <Pill tone="accent">Leads to post-study work</Pill>}
      </div>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
        <p>
          <span className="block text-caption text-muted">Total after scholarships</span>
          <span className="text-metric tabular-nums text-ink">
            {formatNaira(totalNaira, { short: true })}
          </span>
        </p>
        {deadline && <CountdownChip date={deadline} label="Deadline" />}
      </div>
      <div className="mt-4">
        <ButtonLink href={href} size="sm" variant="secondary">
          See requirements
        </ButtonLink>
      </div>
    </Card>
  );
}

const APPLYBOARD_TAGS: Record<string, string> = {
  high_job_availability: "High Job Demand",
  scholarships_available: "Scholarships Available",
  popular_programs: "Popular",
  fast_loa: "Fast Acceptance",
};

function formatIntake(value: string) {
  const parsed = new Date(`${value.slice(0, 10)}T00:00:00`);
  if (!Number.isNaN(parsed.getTime()) && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    return new Intl.DateTimeFormat("en", { month: "short", year: "numeric" }).format(parsed);
  }
  return value;
}

function formatProgrammeMoney(amount: number | null | undefined, currency: string) {
  if (amount === null || amount === undefined || !currency) return "Not listed";
  try {
    return new Intl.NumberFormat("en", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${amount.toLocaleString("en")} ${currency}`;
  }
}

export function ApplyBoardProgrammeCard({
  schoolName,
  schoolLogo,
  country,
  province,
  city,
  name,
  level,
  tuition,
  currency,
  applicationFee,
  minLength,
  maxLength,
  successChance,
  tags,
  intakes,
  instantSubmission,
  onCreate,
  creating = false,
}: {
  schoolName: string;
  schoolLogo?: string;
  country: string;
  province?: string;
  city?: string;
  name: string;
  level: string;
  tuition?: number | null;
  currency?: string;
  applicationFee?: number | null;
  minLength?: number | null;
  maxLength?: number | null;
  successChance?: string;
  tags?: string[];
  intakes?: string[];
  instantSubmission?: boolean;
  onCreate: (intake: string) => void;
  creating?: boolean;
}) {
  const [selectedIntake, setSelectedIntake] = useState(intakes?.[0] ?? "");
  const [saved, setSaved] = useState(false);
  const visibleTags = [...new Set((tags ?? []).map((tag) => APPLYBOARD_TAGS[tag]).filter(Boolean))];
  const duration =
    minLength && maxLength
      ? minLength === maxLength
        ? `${minLength} months`
        : `${minLength}–${maxLength} months`
      : minLength
        ? `${minLength}+ months`
        : "Not listed";
  const location = [province, country].filter(Boolean).join(", ");

  return (
    <article className="relative flex h-full flex-col rounded-r-lg border border-line bg-surface p-4 shadow-e1 transition-[border-color,box-shadow] hover:border-brand-blue-soft hover:shadow-e2 sm:p-5">
      {instantSubmission && (
        <span className="absolute -top-2.5 right-4 rounded-full bg-success px-3 py-1 text-caption font-semibold text-on-success">
          Instant Submission
        </span>
      )}
      <header className="flex min-w-0 items-center gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-line bg-surface text-body-s font-semibold text-muted">
          {schoolLogo ? (
            // ApplyBoard returns external school logos, so next/image cannot optimize them.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={schoolLogo} alt="" loading="lazy" className="size-full object-contain p-1" />
          ) : (
            schoolName.charAt(0).toUpperCase()
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-body-s font-semibold text-ink">{schoolName}</p>
          <p className="truncate text-caption text-muted">
            {city && <>{city} · </>}
            {location}
          </p>
        </div>
        <button
          type="button"
          aria-label={saved ? `Remove ${name} from saved programmes` : `Save ${name}`}
          aria-pressed={saved}
          onClick={() => setSaved((current) => !current)}
          className="flex size-11 shrink-0 items-center justify-center rounded-r-md border border-line text-muted transition-colors hover:bg-sunken hover:text-accent"
        >
          <Heart aria-hidden className={cx("size-5", saved && "fill-current text-accent")} />
        </button>
      </header>

      <div className="mt-4">
        <p className="text-body-s text-muted">{level}</p>
        <h2 className="mt-0.5 font-display text-h3 text-ink underline decoration-transparent underline-offset-2 hover:decoration-current">
          {name}
        </h2>
      </div>

      {(visibleTags.length > 0 || instantSubmission) && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {visibleTags.map((tag) => (
            <Pill key={tag} tone={tag === "Popular" ? "accent" : "success"}>
              {tag}
            </Pill>
          ))}
          {instantSubmission && (
            <Pill tone="info" icon={<FileCheck2 aria-hidden className="size-3.5" />}>
              Fast application
            </Pill>
          )}
        </div>
      )}

      <dl className="mt-4 space-y-2 border-y border-line py-3">
        {[
          ["Location", location || "Not listed"],
          ["Campus city", city || "Not listed"],
          ["Tuition", formatProgrammeMoney(tuition, currency ?? "")],
          ["Application fee", formatProgrammeMoney(applicationFee, currency ?? "")],
          ["Duration", duration],
        ].map(([label, value]) => (
          <div key={label} className="flex items-start justify-between gap-4 text-body-s">
            <dt className="text-muted">{label}</dt>
            <dd className="text-right font-medium text-ink">{value}</dd>
          </div>
        ))}
      </dl>

      {successChance && (
        <div className="flex items-center justify-between gap-3 border-b border-line py-3 text-body-s">
          <span className="text-ink">Success chance</span>
          <span className="flex items-center gap-1.5 text-ink">
            <span aria-hidden className="size-2 rounded-full bg-success" />
            {successChance}
          </span>
        </div>
      )}

      {intakes && intakes.length > 0 ? (
        <fieldset className="mt-3">
          <legend className="mb-2 flex items-center gap-1.5 text-body-s font-medium text-ink">
            <CalendarDays aria-hidden className="size-4 text-muted" />
            Available intakes
          </legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {intakes.map((intake) => (
              <button
                key={intake}
                type="button"
                aria-pressed={selectedIntake === intake}
                onClick={() => setSelectedIntake(intake)}
                className={cx(
                  "rounded-r-sm border px-2 py-1.5 text-body-s transition-colors",
                  selectedIntake === intake
                    ? "border-accent bg-accent-soft font-semibold text-accent"
                    : "border-line text-ink hover:bg-sunken",
                )}
              >
                {formatIntake(intake)}
              </button>
            ))}
          </div>
        </fieldset>
      ) : (
        <label className="mt-3 block text-body-s font-medium text-ink">
          Intake
          <input
            value={selectedIntake}
            onChange={(event) => setSelectedIntake(event.target.value)}
            placeholder="e.g. January 2027"
            className="mt-1 h-10 w-full rounded-r-sm border border-field-line bg-surface px-3 text-body text-ink"
          />
        </label>
      )}

      <Button
        className="mt-4 w-full"
        variant="secondary"
        icon={<FileCheck2 aria-hidden className="size-4" />}
        disabled={!selectedIntake.trim()}
        loading={creating}
        onClick={() => onCreate(selectedIntake)}
      >
        Create application
      </Button>
    </article>
  );
}

export function ScholarshipCard({
  name,
  sponsor,
  value,
  awards,
  deadline,
  returnHome,
  href,
}: {
  name: string;
  sponsor: string;
  /** "Full tuition + €1,200 a month" */
  value: string;
  awards?: number;
  deadline?: string;
  returnHome: boolean;
  href: string;
}) {
  return (
    <Card>
      <Title href={href}>{name}</Title>
      <p className="text-body-s text-muted">{sponsor}</p>
      <p className="mt-2 text-body font-semibold text-ink">{value}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {awards !== undefined && (
          <span className="text-body-s text-muted tabular-nums">
            {awards.toLocaleString()} awards
          </span>
        )}
        {returnHome && (
          <Pill tone="warning" icon={<Home aria-hidden className="size-3.5" />}>
            You must return home after
          </Pill>
        )}
      </div>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
        {deadline && <CountdownChip date={deadline} label="Closes" />}
        <ButtonLink href={href} size="sm" variant="secondary">
          Am I eligible?
        </ButtonLink>
      </div>
    </Card>
  );
}

export function FactCard({
  kindLabel,
  title,
  subtitle,
  detail,
  source,
  confirmed,
  onConfirm,
  onEdit,
  onDelete,
  onSource,
  sourceShown = false,
  children,
}: {
  kindLabel: string;
  title: string;
  subtitle?: string;
  detail?: string;
  source?: { document: string; page?: number };
  confirmed: boolean;
  onConfirm?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  /** Show where the fact came from (the source panel, or inline on small screens). */
  onSource?: () => void;
  sourceShown?: boolean;
  /** Extra content under the actions, e.g. the source excerpt on small screens. */
  children?: React.ReactNode;
}) {
  return (
    <Card className={cx(!confirmed && "border-info-line", sourceShown && "ring-2 ring-accent")}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-overline text-muted uppercase">{kindLabel}</span>
        {confirmed ? (
          <Pill tone="success" icon={<Check aria-hidden className="size-3.5" />}>
            Confirmed
          </Pill>
        ) : (
          <Pill tone="info">Please confirm</Pill>
        )}
      </div>
      <Title>{title}</Title>
      {subtitle && <p className="text-body-s text-muted">{subtitle}</p>}
      {detail && <p className="mt-2 text-body text-ink">{detail}</p>}
      {source && (
        <p className="mt-2 flex items-center gap-1.5 text-caption text-subtle">
          <FileText aria-hidden className="size-3.5" />
          From {source.document}
          {source.page !== undefined && `, page ${source.page}`}
        </p>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        {!confirmed && onConfirm && (
          <Button size="sm" onClick={onConfirm} icon={<Check aria-hidden className="size-4" />}>
            Confirm
          </Button>
        )}
        {onEdit && (
          <Button
            size="sm"
            variant="secondary"
            onClick={onEdit}
            icon={<Pencil aria-hidden className="size-4" />}
          >
            Edit
          </Button>
        )}
        {onDelete && (
          <Button
            size="sm"
            variant="tertiary"
            onClick={onDelete}
            icon={<Trash2 aria-hidden className="size-4" />}
          >
            Delete
          </Button>
        )}
        {onSource && (
          <Button
            size="sm"
            variant="tertiary"
            aria-pressed={sourceShown}
            onClick={onSource}
            icon={<FileText aria-hidden className="size-4" />}
          >
            See source
          </Button>
        )}
      </div>
      {children}
    </Card>
  );
}

export function DocumentCard({
  kindLabel,
  name,
  expiresOn,
  warnDays = 90,
  usedIn = 0,
  onView,
  onReplace,
}: {
  kindLabel: string;
  name: string;
  expiresOn?: string | null;
  /** Warn this many days ahead (a passport uses 365). */
  warnDays?: number;
  usedIn?: number;
  onView?: () => void;
  onReplace?: () => void;
}) {
  const days = expiresOn ? daysBetween(expiresOn) : null;
  const expired = days !== null && days < 0;
  const soon = days !== null && !expired && days <= warnDays;
  return (
    <Card>
      <p className="text-overline text-muted uppercase">{kindLabel}</p>
      <Title>{name}</Title>
      {expiresOn && (
        <p
          className={cx(
            "mt-1 flex items-center gap-1.5 text-body-s",
            expired ? "text-danger" : soon ? "text-warning" : "text-muted",
          )}
        >
          <CalendarClock aria-hidden className="size-4" />
          {expired ? "Expired" : "Expires"} {formatDate(expiresOn)}
          {soon && ` · ${Math.round((days as number) / 30)} months left`}
        </p>
      )}
      {usedIn > 0 && (
        <p className="mt-1 text-body-s text-muted">
          Used in {usedIn} application{usedIn === 1 ? "" : "s"}
        </p>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        {onView && (
          <Button size="sm" variant="secondary" onClick={onView}>
            View
          </Button>
        )}
        {onReplace && (
          <Button size="sm" variant="tertiary" onClick={onReplace}>
            Replace
          </Button>
        )}
      </div>
    </Card>
  );
}

export function ApplicationCard({
  organisation,
  title,
  stageLabel,
  lastEvent,
  nextAction,
  followUpOn,
  href,
}: {
  organisation: string;
  title: string;
  stageLabel: string;
  lastEvent?: string;
  nextAction?: string;
  followUpOn?: string;
  href: string;
}) {
  return (
    <Card className="p-4">
      <p className="text-caption text-muted">{stageLabel}</p>
      <h3 className="font-semibold text-ink">
        <Link href={href} className="hover:underline hover:underline-offset-3">
          {organisation}
        </Link>
      </h3>
      <p className="text-body-s text-muted">{title}</p>
      {lastEvent && <p className="mt-2 text-caption text-subtle">{lastEvent}</p>}
      {nextAction && (
        <p className="mt-2 flex items-start gap-1.5 text-body-s text-ink">
          <FlagIcon aria-hidden className="mt-0.5 size-3.5 shrink-0 text-accent" />
          {nextAction}
        </p>
      )}
      {followUpOn && (
        <p className="mt-1 text-caption text-muted">Follow up {formatDate(followUpOn)}</p>
      )}
    </Card>
  );
}
