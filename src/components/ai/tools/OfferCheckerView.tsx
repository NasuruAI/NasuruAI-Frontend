"use client";

import { RotateCcw } from "lucide-react";
import { useState } from "react";
import { ApiError } from "@/lib/api";
import {
  type NextStep,
  type OfferResult,
  type PublicOfferCheck,
  reportRoutes,
  usePublicOfferCheck,
  useStartPublicOfferCheck,
} from "@/lib/ai/jobs";
import { Button } from "../Button";
import { TaskProgress } from "../evidence/Progress";
import { type Check, ScamVerdict, type Verdict } from "../evidence/Trust";
import { InlineAlert } from "../feedback";
import { TextArea } from "../fields";
import { ToolShell } from "./ToolShell";

type Extracted = { company_name?: string; job_title?: string; red_flags?: string[] };

const SUMMARY: Record<Verdict, string> = {
  genuine: "Everything we could check matches the company's own records.",
  caution: "Some checks didn't pass or couldn't be run. Treat this offer with care.",
  scam: "This offer has the signs of a scam.",
};

/** The verdict's checks as CheckList rows (the same shape the signed-in checker uses). */
function toChecks(check: PublicOfferCheck): Check[] {
  const results = (Array.isArray(check.checks) ? check.checks : []) as OfferResult[];
  return results.map((result) => ({
    name: result.label,
    outcome: result.outcome,
    evidence: result.evidence,
    source: result.source_url ? { name: "Evidence", url: result.source_url } : undefined,
  }));
}

function Result({ check, onAgain }: { check: PublicOfferCheck; onAgain: () => void }) {
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
        {check.error || "Something went wrong reading it. Try pasting it again."}
      </InlineAlert>
    );
  }

  const extracted = (check.extracted ?? {}) as Extracted;
  const steps = (check.next_steps ?? []) as NextStep[];
  const verdict = (check.verdict || "caution") as Verdict;
  const about = [extracted.job_title, extracted.company_name].filter(Boolean).join(" at ");

  return (
    <div className="space-y-4">
      {about && <p className="text-body-s text-muted">About: {about}</p>}
      <ScamVerdict
        verdict={verdict}
        summary={SUMMARY[verdict]}
        checks={toChecks(check)}
        reportRoutes={reportRoutes(steps)}
        actions={
          <Button
            size="sm"
            variant="tertiary"
            icon={<RotateCcw aria-hidden className="size-4" />}
            onClick={onAgain}
          >
            Check another offer
          </Button>
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
      <p className="text-body-s text-muted">
        Want to report this offer, keep a record of it, or check the employer in full? Create a free
        account below.
      </p>
    </div>
  );
}

/** /ai/tools/offer-checker — the free, no-account scam checker (web.md §3, §7.3). */
export function OfferCheckerView() {
  const start = useStartPublicOfferCheck();
  const [text, setText] = useState("");
  const [checkId, setCheckId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const check = usePublicOfferCheck(checkId);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!text.trim()) {
      setError("Paste the offer to check it.");
      return;
    }
    setError(null);
    start.mutate(text.trim(), {
      onSuccess: (result) => setCheckId(result.id),
      onError: (err) =>
        setError(err instanceof ApiError ? err.message : "That didn't send. Try again."),
    });
  }

  function again() {
    setCheckId(null);
    setText("");
    setError(null);
    start.reset();
  }

  const working = checkId !== null;
  const form = (
    <form noValidate onSubmit={submit} className="space-y-4">
      {error && <InlineAlert tone="danger" title={error} />}
      <TextArea
        label="The offer"
        helper="Paste the WhatsApp message, email or letter as it came — including the sender's address."
        rows={10}
        value={text}
        onChange={(event) => setText(event.target.value)}
        disabled={working}
      />
      {working ? (
        <Button type="button" size="lg" variant="secondary" onClick={again}>
          Check another offer
        </Button>
      ) : (
        <Button type="submit" size="lg" loading={start.isPending}>
          Check this offer
        </Button>
      )}
      <p className="text-caption text-subtle">
        A real employer never asks you to pay for a job, a visa or a Certificate of Sponsorship.
      </p>
    </form>
  );

  const result =
    checkId && check.data ? (
      <Result check={check.data} onAgain={again} />
    ) : (
      <div className="text-body-s text-muted">
        <p className="font-semibold text-ink">Your verdict will show here.</p>
        <p className="mt-2">
          We check the company, its sponsor licence, the sender&apos;s address and the usual scam
          signs — then give you a plain answer with the evidence. Nothing is saved, and you need no
          account.
        </p>
      </div>
    );

  return (
    <ToolShell
      title="Check a job offer for scams — free"
      blurb="Got an offer on WhatsApp? Paste it here. We check it against the company's own records and the signs of a scam, and tell you straight."
      form={form}
      result={result}
    />
  );
}
