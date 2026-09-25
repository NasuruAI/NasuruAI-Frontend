/**
 * Composite cards (design-system §8.3). Presentational: feature modules map
 * API data onto these props.
 */

import {
  BadgeCheck,
  Bookmark,
  BookmarkCheck,
  Building2,
  CalendarClock,
  Check,
  FileText,
  Flag as FlagIcon,
  Home,
  MapPin,
  Pencil,
  Trash2,
} from "lucide-react";
import Link from "next/link";
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
        "rounded-r-md border border-line bg-surface p-5 transition-shadow duration-m-fast hover:shadow-e1",
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
      {salary && (
        <p className="mt-2 text-body">
          <MoneyText naira={salary.naira} foreign={salary.foreign} short />
        </p>
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
