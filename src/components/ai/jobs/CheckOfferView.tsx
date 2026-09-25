"use client";

import { FileSearch, RotateCcw, ShieldAlert } from "lucide-react";
import { useState } from "react";
import { ApiError } from "@/lib/api";
import {
  type NextStep,
  type OfferCheck,
  type OfferResult,
  reportRoutes,
  useOfferCheck,
  useOfferChecks,
  useReportOffer,
  useStartOfferCheck,
} from "@/lib/ai/jobs";
import { Button, ButtonLink } from "../Button";
import { formatDate } from "../evidence/format";
import { TaskProgress } from "../evidence/Progress";
import { type Check, ScamVerdict, type Verdict } from "../evidence/Trust";
import { InlineAlert } from "../feedback";
import { TextArea } from "../fields";
import { type UploadItem, Uploader } from "../Uploader";
import { ReportDialog } from "./parts";

const ACCEPT = ".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg";
const MAX_BYTES = 10 * 1024 * 1024;

const SUMMARY: Record<Verdict, string> = {
  genuine: "Everything we could check matches the company's own records.",
  caution: "Some checks didn't pass or couldn't be run. Treat this offer with care.",
  scam: "This offer has the signs of a scam.",
};

type Extracted = { company_name?: string; job_title?: string; red_flags?: string[] };

/** The offer checker's results as CheckList rows. */
export function offerChecks(check: OfferCheck): Check[] {
  const results = (Array.isArray(check.checks) ? check.checks : []) as OfferResult[];
  return results.map((result) => ({
    name: result.label,
    outcome: result.outcome,
    evidence: result.evidence,
    source: result.source_url ? { name: "Evidence", url: result.source_url } : undefined,
  }));
}

function Result({ check, onAgain }: { check: OfferCheck; onAgain: () => void }) {
  const report = useReportOffer();
  const [reporting, setReporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const extracted = (check.extracted ?? {}) as Extracted;
  const steps = (check.next_steps ?? []) as NextStep[];
  const verdict = (check.verdict || "caution") as Verdict;
  const about = [extracted.job_title, extracted.company_name].filter(Boolean).join(" at ");

  if (check.status === "checking") {
    return (
      <TaskProgress
        title="Checking this offer"
        steps={[
          { label: "Reading the offer", state: "active" },
          { label: "Checking the company, sponsor register and sender", state: "pending" },
          { label: "Your verdict", state: "pending" },
        ]}
      />
    );
  }
  if (check.status === "failed") {
    return (
      <InlineAlert
        tone="danger"
        title="We couldn't check this offer"
        action={
          <Button size="sm" variant="secondary" onClick={onAgain}>
            Try again
          </Button>
        }
      >
        {check.error || "Something went wrong reading it. Try pasting the text instead."}
      </InlineAlert>
    );
  }

  return (
    <div className="space-y-4">
      {about && <p className="text-body-s text-muted">About: {about}</p>}
      <ScamVerdict
        verdict={verdict}
        summary={SUMMARY[verdict]}
        checks={offerChecks(check)}
        reportRoutes={reportRoutes(steps)}
        actions={
          <div className="flex flex-wrap gap-2">
            {verdict !== "genuine" && (
              <Button
                variant="danger"
                size="sm"
                icon={<ShieldAlert aria-hidden className="size-4" />}
                onClick={() => {
                  report.reset();
                  setError(null);
                  setReporting(true);
                }}
              >
                Report as scam
              </Button>
            )}
            {verdict === "genuine" && (
              <ButtonLink href="/ai/documents" size="sm">
                Add it to your documents
              </ButtonLink>
            )}
            <Button
              size="sm"
              variant="tertiary"
              icon={<RotateCcw aria-hidden className="size-4" />}
              onClick={onAgain}
            >
              Check another offer
            </Button>
          </div>
        }
      />
      {!!extracted.red_flags?.length && (
        <section aria-labelledby="flags-heading" className="rounded-r-md border border-line p-4">
          <h2 id="flags-heading" className="text-h4 text-ink">
            What stood out
          </h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-body-s text-ink">
            {extracted.red_flags.map((flag) => (
              <li key={flag}>{flag}</li>
            ))}
          </ul>
        </section>
      )}
      {steps
        .filter((step) => !step.action.startsWith("report_"))
        .map((step) => (
          <p key={step.action} className="text-body-s text-ink">
            {step.label}
          </p>
        ))}
      {reporting && (
        <ReportDialog
          open
          what="this offer"
          onClose={() => setReporting(false)}
          pending={report.isPending}
          done={report.isSuccess}
          error={error}
          onSubmit={(input) =>
            report.mutate(
              { id: check.id, ...input },
              {
                onError: (err) =>
                  setError(err instanceof ApiError ? err.message : "That didn't send."),
              },
            )
          }
        />
      )}
    </div>
  );
}

/** /ai/check-offer (web.md §7.3). */
export function CheckOfferView() {
  const start = useStartOfferCheck();
  const history = useOfferChecks();
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [checkId, setCheckId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const check = useOfferCheck(checkId);

  const items: UploadItem[] = file
    ? [
        {
          id: "offer",
          name: file.name,
          size: file.size,
          type: file.type,
          status: "done",
          note: "Ready to check.",
        },
      ]
    : [];

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!text.trim() && !file) {
      setError("Paste the offer, or add it as a PDF or a screenshot.");
      return;
    }
    setError(null);
    start.mutate(
      { text: text.trim(), file: file ?? undefined },
      {
        onSuccess: (result) => setCheckId(result.id),
        onError: (err) =>
          setError(err instanceof ApiError ? err.message : "That didn't send. Try again."),
      },
    );
  }

  function again() {
    setCheckId(null);
    setText("");
    setFile(null);
    start.reset();
  }

  return (
    <>
      <h1 className="font-display text-h1 text-ink">Check a job offer</h1>
      <p className="mt-2 mb-6 max-w-[65ch] text-body-l text-muted">
        Paste an offer or a Certificate of Sponsorship. We check the company, its sponsor licence,
        the sender and the usual scam signs. A real employer never asks you to pay for a job.
      </p>

      {checkId && check.data ? (
        <Result check={check.data} onAgain={again} />
      ) : (
        <form noValidate onSubmit={submit} className="max-w-2xl space-y-4">
          {error && <InlineAlert tone="danger" title={error} />}
          <TextArea
            label="The offer"
            helper="Paste the email or letter as it came, including the sender's address."
            rows={8}
            value={text}
            onChange={(event) => setText(event.target.value)}
          />
          <Uploader
            label="Or add the offer as a file"
            hint="PDF, or a screenshot (JPG or PNG), up to 10 MB."
            accept={ACCEPT}
            multiple={false}
            maxBytes={MAX_BYTES}
            items={items}
            onFiles={(files) => setFile(files[0] ?? null)}
            onRemove={() => setFile(null)}
          />
          <Button type="submit" size="lg" loading={start.isPending}>
            Check this offer
          </Button>
        </form>
      )}

      {!!history.data?.length && (
        <section aria-labelledby="past-heading" className="mt-10 max-w-2xl">
          <h2 id="past-heading" className="mb-3 text-h3 text-ink">
            Offers you&apos;ve checked
          </h2>
          <ul className="divide-y divide-line rounded-r-md border border-line">
            {history.data.slice(0, 10).map((past) => {
              const extracted = (past.extracted ?? {}) as Extracted;
              return (
                <li key={past.id}>
                  <button
                    type="button"
                    onClick={() => setCheckId(past.id)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-sunken"
                  >
                    <FileSearch aria-hidden className="size-4 shrink-0 text-muted" />
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold text-ink">
                        {extracted.company_name || "Unnamed company"}
                      </span>
                      <span className="block text-body-s text-muted">
                        {past.status === "done"
                          ? past.verdict_label
                          : past.status === "failed"
                            ? "Couldn't be checked"
                            : "Checking…"}{" "}
                        · {formatDate(past.created_at)}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </>
  );
}
