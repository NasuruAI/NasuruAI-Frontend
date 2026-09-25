"use client";

import { Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ApiError } from "@/lib/api";
import { type Job, type ReportInput, salaryRange, useFxRate, useRequestPack } from "@/lib/ai/jobs";
import { Button, type ButtonProps } from "../Button";
import { Checkbox } from "../choice";
import { Dialog } from "../Dialog";
import { formatDate, formatForeign, formatNaira } from "../evidence/format";
import { FitScore, WhyRankPanel } from "../evidence/Trust";
import { InlineAlert } from "../feedback";
import { TextArea } from "../fields";

const PERIOD: Record<string, string> = {
  year: "a year",
  month: "a month",
  week: "a week",
  day: "a day",
  hour: "an hour",
};

/**
 * "₦92m–₦108m a year · €48,000–€56,000", naira first (design-system §4.3),
 * with the rate's date when asked. Without a rate, the job's own currency.
 */
export function SalaryText({
  job,
  short = true,
  showRate = false,
  className,
}: {
  job: Pick<
    Job,
    "salary_min" | "salary_max" | "salary_currency" | "salary_period" | "salary_is_estimate"
  >;
  short?: boolean;
  showRate?: boolean;
  className?: string;
}) {
  const range = salaryRange(job);
  const fx = useFxRate(range ? job.salary_currency : null);
  if (!range) return <span className={className}>Salary not given</span>;
  const period = PERIOD[job.salary_period] ?? "";
  const foreign =
    range.min === range.max
      ? formatForeign(range.min, job.salary_currency)
      : `${formatForeign(range.min, job.salary_currency)}–${formatForeign(range.max, job.salary_currency)}`;
  const rate = job.salary_currency === "NGN" ? 1 : fx.data?.rate;
  const naira =
    rate === undefined
      ? null
      : range.min === range.max
        ? formatNaira(range.min * rate, { short })
        : `${formatNaira(range.min * rate, { short })}–${formatNaira(range.max * rate, { short })}`;
  return (
    <span className={className}>
      {naira ? (
        <>
          <span className="font-semibold text-ink tabular-nums">{naira}</span>
          {period && ` ${period}`}
          {job.salary_currency !== "NGN" && (
            <span className="text-muted tabular-nums"> · {foreign}</span>
          )}
        </>
      ) : (
        <>
          <span className="font-semibold text-ink tabular-nums">{foreign}</span>
          {period && ` ${period}`}
        </>
      )}
      {job.salary_is_estimate && <span className="text-muted"> (estimate)</span>}
      {showRate && fx.data && (
        <span className="block text-caption text-subtle">
          at {formatNaira(fx.data.rate)} to 1 {job.salary_currency}, {formatDate(fx.data.on)} (
          {fx.data.source})
        </span>
      )}
    </span>
  );
}

/**
 * "Prepare answers": asks for the job's answer pack and opens it. Over the
 * free quota, says so where the person is, with the way on (web.md §14).
 */
export function PrepareButton({
  jobId,
  ...props
}: { jobId: string } & Omit<ButtonProps, "onClick" | "loading">) {
  const router = useRouter();
  const request = useRequestPack();
  const [error, setError] = useState<ApiError | null>(null);

  function prepare() {
    setError(null);
    request.mutate(jobId, {
      onSuccess: (pack) => router.push(`/ai/packs/${pack.id}`),
      onError: (err) =>
        setError(err instanceof ApiError ? err : new ApiError("That didn't work. Try again.", 0)),
    });
  }

  return (
    <div className="space-y-2">
      <Button
        {...props}
        icon={<Sparkles aria-hidden className="size-4" />}
        loading={request.isPending}
        onClick={prepare}
      >
        {props.children ?? "Prepare answers"}
      </Button>
      {error &&
        (error.status === 402 ? (
          <InlineAlert
            tone="warning"
            title="You've used this month's free answer packs"
            action={
              <Link
                href="/ai/billing"
                className="font-semibold text-accent underline underline-offset-3"
              >
                See plans
              </Link>
            }
          >
            {error.message}
          </InlineAlert>
        ) : (
          <InlineAlert tone="danger" title={error.message} />
        ))}
    </div>
  );
}

/** Report a job or an offer as a scam (US-205). Anonymous by default. */
export function ReportDialog({
  open,
  onClose,
  what,
  onSubmit,
  pending,
  done,
  error,
}: {
  open: boolean;
  onClose: () => void;
  what: string;
  onSubmit: (input: ReportInput) => void;
  pending: boolean;
  done: boolean;
  error: string | null;
}) {
  const [details, setDetails] = useState("");
  const [anonymous, setAnonymous] = useState(true);
  const [publish, setPublish] = useState(false);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={done ? "Thank you" : `Report ${what}`}
      description={
        done
          ? undefined
          : "Our team reviews every report. After three independent reports, a job is hidden while we check."
      }
      footer={
        done ? (
          <Button onClick={onClose}>Close</Button>
        ) : (
          <>
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="danger"
              loading={pending}
              onClick={() =>
                onSubmit({ details: details.trim(), anonymous, consent_to_publish: publish })
              }
            >
              Send report
            </Button>
          </>
        )
      }
    >
      {done ? (
        <p className="text-body text-ink">
          We&apos;ve got your report. Don&apos;t pay anything or send documents to them while we
          look into it.
        </p>
      ) : (
        <div className="space-y-4">
          {error && <InlineAlert tone="danger" title={error} />}
          <TextArea
            label="What happened?"
            optional
            rows={3}
            maxLength={5000}
            helper="For example: they asked for a fee, or the email doesn't match the company."
            value={details}
            onChange={(event) => setDetails(event.target.value)}
          />
          <Checkbox
            label="Report anonymously"
            description="Staff see the report, not who sent it."
            checked={anonymous}
            onChange={setAnonymous}
          />
          <Checkbox
            label="Add it to the public scam list once confirmed"
            description="Only the company's details are published, never yours."
            checked={publish}
            onChange={setPublish}
          />
        </div>
      )}
    </Dialog>
  );
}

/**
 * How the fit score was reached: the factors with their weights, and the
 * must-haves checked first. Falls back to the reasons for older responses.
 */
export function FitBreakdown({ fit }: { fit: Job["fit"] }) {
  const factors = fit.factors ?? [];
  const filters = fit.hard_filters ?? [];
  if (!factors.length && !filters.length) {
    return <FitScore score={fit.score} reasons={fit.reasons} />;
  }
  return (
    <div className="space-y-4">
      {factors.length > 0 && <FitScore score={fit.score} reasons={[]} />}
      <WhyRankPanel factors={factors} filters={filters} />
    </div>
  );
}
