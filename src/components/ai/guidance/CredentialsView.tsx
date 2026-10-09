"use client";

/**
 * Transcript and evaluation tracker (web.md §11.5 "Credentials", F12): find
 * your institution, see its steps, generate a request letter, and track
 * status through to received.
 */

import { Check, Copy, GraduationCap, Search } from "lucide-react";
import { useState } from "react";
import { useAnnouncer } from "@/components/ui/Announcer";
import {
  type CredentialGuide,
  type CredentialRequest,
  type CredentialStatus,
  useAddCredentialRequest,
  useCredentialGuides,
  useCredentialLetter,
  useCredentialRequests,
  useUpdateCredentialRequest,
} from "@/lib/ai/guidance";
import { Button } from "../Button";
import { formatDate } from "../evidence/format";
import { EmptyState, InlineAlert, Skeleton } from "../feedback";
import { Select } from "../Select";
import { TextField } from "../fields";

const STATUS_LABEL: Record<CredentialStatus, string> = {
  planned: "Not started",
  requested: "Requested",
  paid: "Fee paid",
  dispatched: "Sent by the university",
  received: "Received",
};
const STATUS_OPTIONS = (Object.keys(STATUS_LABEL) as CredentialStatus[]).map((value) => ({
  value,
  label: STATUS_LABEL[value],
}));

function LetterGenerator({ guide }: { guide: CredentialGuide }) {
  const [recipient, setRecipient] = useState("");
  const [show, setShow] = useState(false);
  const letter = useCredentialLetter(show ? guide.id : null, recipient);
  const addRequest = useAddCredentialRequest();
  const { announce } = useAnnouncer();
  const [copied, setCopied] = useState(false);

  async function copy() {
    if (!letter.data) return;
    await navigator.clipboard.writeText(letter.data);
    setCopied(true);
    announce("Letter copied");
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="mt-4 space-y-3 rounded-r-md border border-line bg-surface p-4">
      <TextField
        label="Who it's going to"
        placeholder="e.g. WES, uni-assist, the university"
        value={recipient}
        onChange={(event) => setRecipient(event.target.value)}
      />
      <div className="flex gap-2">
        <Button size="sm" onClick={() => setShow(true)} loading={show && letter.isPending}>
          Generate letter
        </Button>
        <Button
          size="sm"
          variant="secondary"
          loading={addRequest.isPending}
          onClick={() =>
            addRequest.mutate(
              {
                guide: guide.id,
                institution: guide.institution,
                recipient: recipient || "Not set yet",
              },
              { onSuccess: () => announce("Added to your requests") },
            )
          }
        >
          Track this request
        </Button>
      </div>
      {show && letter.data && (
        <div className="rounded-r-sm bg-sunken p-4">
          <pre className="text-body-s whitespace-pre-wrap text-ink">{letter.data}</pre>
          <Button
            size="sm"
            variant="tertiary"
            icon={
              copied ? (
                <Check aria-hidden className="size-4" />
              ) : (
                <Copy aria-hidden className="size-4" />
              )
            }
            onClick={copy}
            className="mt-2"
          >
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
      )}
    </div>
  );
}

function GuideCard({ guide }: { guide: CredentialGuide }) {
  const [open, setOpen] = useState(false);
  const steps = Array.isArray(guide.steps) ? (guide.steps as string[]) : [];
  return (
    <li className="rounded-r-md border border-line p-5">
      <button type="button" onClick={() => setOpen((v) => !v)} className="w-full text-left">
        <p className="font-display text-h4 text-ink">{guide.institution}</p>
        <p className="mt-1 text-body-s text-muted">
          {guide.typical_days
            ? `Usually ${guide.typical_days} days`
            : "Typical delay not on record"}
          {guide.fee_text && ` · ${guide.fee_text}`}
        </p>
      </button>
      {open && (
        <div className="mt-3 space-y-3">
          {steps.length > 0 && (
            <ol className="list-decimal space-y-1 pl-5 text-body-s text-ink">
              {steps.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          )}
          {guide.delivery_options && (
            <p className="text-body-s text-muted">Delivery: {guide.delivery_options}</p>
          )}
          {guide.notes && <p className="text-body-s text-muted">{guide.notes}</p>}
          {guide.letter_template && <LetterGenerator guide={guide} />}
        </div>
      )}
    </li>
  );
}

function RequestRow({ request }: { request: CredentialRequest }) {
  const update = useUpdateCredentialRequest();
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 p-4">
      <div className="min-w-0">
        <p className="font-semibold text-ink">{request.institution}</p>
        <p className="text-body-s text-muted">
          To {request.recipient}
          {request.requested_on && ` · requested ${formatDate(request.requested_on)}`}
        </p>
      </div>
      <Select
        label={`Status for ${request.institution}`}
        hideLabel
        value={request.status ?? "planned"}
        options={STATUS_OPTIONS}
        disabled={update.isPending}
        onChange={(event) =>
          update.mutate({
            id: request.id,
            version: request.version,
            status: event.target.value as CredentialStatus,
          })
        }
        className="w-auto"
      />
    </li>
  );
}

export function CredentialsView() {
  const [query, setQuery] = useState("");
  const guides = useCredentialGuides(query);
  const requests = useCredentialRequests();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-h2 text-ink">Credentials</h1>
        <p className="mt-1 text-body text-muted">
          Getting transcripts from your Nigerian institution: the steps, a letter you can send, and
          where each request stands.
        </p>
      </div>

      <div>
        <TextField
          label="Find your institution"
          placeholder="e.g. University of Lagos"
          leading={<Search aria-hidden className="size-4" />}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <div className="mt-4">
          {guides.isPending && query.trim().length > 1 ? (
            <Skeleton className="h-24" />
          ) : query.trim().length > 1 && !guides.data?.length ? (
            <EmptyState icon={<GraduationCap aria-hidden />} title="Nothing on record for that yet">
              Our researchers haven&apos;t written this institution up yet.
            </EmptyState>
          ) : (
            <ul className="space-y-3">
              {guides.data?.map((guide) => (
                <GuideCard key={guide.id} guide={guide} />
              ))}
            </ul>
          )}
        </div>
      </div>

      <section>
        <h2 className="text-h3 text-ink">Your requests</h2>
        {requests.isPending ? (
          <Skeleton className="mt-3 h-24" />
        ) : !requests.data?.length ? (
          <p className="mt-2 text-body-s text-muted">Nothing tracked yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-line rounded-r-md border border-line">
            {requests.data.map((request) => (
              <RequestRow key={request.id} request={request} />
            ))}
          </ul>
        )}
        {requests.isError && <InlineAlert tone="danger" title="We couldn't load your requests." />}
      </section>
    </div>
  );
}
