"use client";

import {
  ArrowLeft,
  BadgeCheck,
  ExternalLink,
  GraduationCap,
  HandHeart,
  PlusCircle,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { ApiError } from "@/lib/api";
import {
  ADMISSIBILITY_STATUS,
  admissibilityCheckRows,
  programmeCostLines,
  useAddToBoard,
  useHandoffDisclosure,
  useProgramme,
  useProgrammeCard,
  useRequestHandoff,
} from "@/lib/ai/study";
import { Button } from "../Button";
import { Checkbox } from "../choice";
import { cx } from "../cx";
import { Dialog } from "../Dialog";
import { CostBreakdown } from "../evidence/Money";
import { CountdownChip, StatusPill } from "../evidence/Status";
import { CheckList } from "../evidence/Trust";
import { EmptyState, InlineAlert, Skeleton } from "../feedback";
import { TextArea } from "../fields";
import { TabPanel, Tabs } from "../Tabs";
import { useToast } from "../Toast";

type Tab = "overview" | "admissibility" | "cost" | "deadlines" | "apply" | "after";

/** "Want a person to handle this application?" — only after reading the disclosure. */
function HandoffDialog({ programmeId, onClose }: { programmeId: string; onClose: () => void }) {
  const disclosure = useHandoffDisclosure();
  const request = useRequestHandoff();
  const toast = useToast();
  const [read, setRead] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);

  function send() {
    if (!disclosure.data) return;
    if (!read) {
      setError("Read and agree to the disclosure first.");
      return;
    }
    setError(null);
    request.mutate(
      {
        consent: true,
        disclosure_version: disclosure.data.version,
        programme_ids: [programmeId],
        message: message.trim(),
      },
      {
        onSuccess: () => {
          onClose();
          toast({ message: "Sent. The agency will follow up with you directly." });
        },
        onError: (err) =>
          setError(err instanceof ApiError ? err.message : "That didn't send. Try again."),
      },
    );
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title="Want a person to handle this?"
      description="The agency only sees what you choose to share, only after you agree below."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={request.isPending} disabled={disclosure.isPending} onClick={send}>
            Send to the agency
          </Button>
        </>
      }
    >
      <div className="space-y-3 pb-2">
        {error && <InlineAlert tone="danger" title={error} />}
        {disclosure.isPending ? (
          <Skeleton className="h-24 w-full" />
        ) : (
          <>
            <div className="max-h-48 overflow-y-auto rounded-r-md border border-line bg-sunken p-3 text-body-s whitespace-pre-line text-ink">
              {disclosure.data?.text}
            </div>
            <Checkbox
              label="I've read this and agree to share my details with the agency for this programme."
              checked={read}
              onChange={setRead}
            />
            <TextArea
              label="Anything you want them to know"
              optional
              rows={3}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
            />
          </>
        )}
      </div>
    </Dialog>
  );
}

/** /ai/study/[id] (web.md §10.2-10.5). */
export function ProgrammeDetailView({ id }: { id: string }) {
  const programme = useProgramme(id);
  const card = useProgrammeCard(id);
  const addToBoard = useAddToBoard();
  const toast = useToast();
  const [tab, setTab] = useState<Tab>("overview");
  const [handoffOpen, setHandoffOpen] = useState(false);

  if (programme.isPending) {
    return (
      <div aria-busy="true" aria-label="Loading the programme" className="space-y-3">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  if (programme.isError) {
    return (
      <EmptyState icon={<GraduationCap />} title="We couldn't find that programme">
        It may no longer be offered.{" "}
        <Link href="/ai/study" className="text-accent underline underline-offset-3">
          See programmes
        </Link>
      </EmptyState>
    );
  }

  const data = programme.data;
  const costLines = programmeCostLines(data.cost);
  const flags = data.flags;

  function addProgrammeToBoard(intakeId?: string) {
    addToBoard.mutate(
      { programmeId: id, intakeId },
      { onSuccess: () => toast({ message: "Added to your board." }) },
    );
  }

  const tabs = [
    { value: "overview" as const, label: "Overview" },
    { value: "admissibility" as const, label: "Can I get in?" },
    { value: "cost" as const, label: "Total cost" },
    { value: "deadlines" as const, label: "Deadlines" },
    { value: "apply" as const, label: "Apply" },
    { value: "after" as const, label: "After graduating" },
  ];

  return (
    <>
      <Link
        href="/ai/study"
        className="mb-4 inline-flex items-center gap-1 text-body-s font-semibold text-accent hover:underline"
      >
        <ArrowLeft aria-hidden className="size-4" /> Programmes
      </Link>
      <header className="mb-6">
        <div className="flex flex-wrap items-start gap-3">
          <h1 className="font-display text-h1 text-balance text-ink">{data.name}</h1>
          <StatusPill status={ADMISSIBILITY_STATUS[data.admissibility]} className="mt-2" />
        </div>
        <p className="mt-2 text-body text-muted">
          {data.institution.name} · {data.institution.city}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            variant="secondary"
            size="sm"
            icon={<PlusCircle aria-hidden className="size-4" />}
            disabled={Boolean(card.data)}
            loading={addToBoard.isPending}
            onClick={() => addProgrammeToBoard(data.intakes?.[0]?.id)}
          >
            {card.data ? "On your board" : "Add to board"}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            icon={<HandHeart aria-hidden className="size-4" />}
            onClick={() => setHandoffOpen(true)}
          >
            Want a person to handle this?
          </Button>
        </div>
      </header>

      <Tabs
        id="programme"
        label="Programme details"
        tabs={tabs}
        value={tab}
        onChange={setTab}
        className="mb-6"
      />
      <TabPanel tabsId="programme" value={tab}>
        {tab === "overview" && (
          <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
            <div>
              <dt className="text-body-s text-muted">Level</dt>
              <dd className="text-body text-ink">{data.level}</dd>
            </div>
            {data.subject && (
              <div>
                <dt className="text-body-s text-muted">Subject</dt>
                <dd className="text-body text-ink">{data.subject}</dd>
              </div>
            )}
            <div>
              <dt className="text-body-s text-muted">Duration</dt>
              <dd className="text-body text-ink">{data.duration_months} months</dd>
            </div>
            <div>
              <dt className="text-body-s text-muted">Language of instruction</dt>
              <dd className="text-body text-ink">{data.language}</dd>
            </div>
            {flags.shortage_subject && (
              <div className="sm:col-span-2">
                <p className="inline-flex items-center gap-1.5 text-body-s font-semibold text-accent">
                  <BadgeCheck aria-hidden className="size-4" /> A shortage subject in{" "}
                  {data.institution.country}
                </p>
              </div>
            )}
          </dl>
        )}

        {tab === "admissibility" && (
          <CheckList checks={admissibilityCheckRows(data.admissibility_checks)} />
        )}

        {tab === "cost" &&
          (costLines.length ? (
            <div className="space-y-3">
              <CostBreakdown lines={costLines} />
              {!data.cost.complete && (
                <p className="text-body-s text-muted">
                  Some costs aren&apos;t priced yet, so this total is a floor:{" "}
                  {data.cost.missing.join(", ")}.
                </p>
              )}
            </div>
          ) : (
            <p className="text-body text-muted">Our researchers haven&apos;t priced this yet.</p>
          ))}

        {tab === "deadlines" &&
          (data.intakes.length ? (
            <ul className="space-y-3">
              {data.intakes.map((intake) => (
                <li
                  key={intake.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-r-md border border-line p-4"
                >
                  <div>
                    <p className="font-semibold text-ink">Starts {intake.starts_on}</p>
                    {intake.deadline_note && (
                      <p className="text-body-s text-muted">{intake.deadline_note}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    {intake.deadline && <CountdownChip date={intake.deadline} label="Deadline" />}
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => addProgrammeToBoard(intake.id)}
                      disabled={Boolean(card.data)}
                    >
                      Track this intake
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-body text-muted">No intake dates published yet.</p>
          ))}

        {tab === "apply" && (
          <div className="space-y-4">
            {data.url ? (
              <a
                href={data.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-11 items-center gap-2 rounded-r-md border border-field-line px-4 text-body font-semibold text-ink hover:bg-sunken"
              >
                Apply on the official page
                <ExternalLink aria-hidden className="size-4" />
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            ) : (
              <p className="text-body text-muted">We don&apos;t have an application link yet.</p>
            )}
            <div className="rounded-r-md border border-line bg-surface p-5">
              <h2 className="text-h4 text-ink">Prefer a person to handle it?</h2>
              <p className="mt-1 text-body-s text-muted">
                Hand this programme to the agency, with your consent, and they&apos;ll take it from
                here.
              </p>
              <Button
                className="mt-3"
                variant="secondary"
                size="sm"
                icon={<HandHeart aria-hidden className="size-4" />}
                onClick={() => setHandoffOpen(true)}
              >
                Want a person to handle this?
              </Button>
            </div>
          </div>
        )}

        {tab === "after" && (
          <div className="space-y-2">
            <p className={cx("text-body", flags.post_study_work ? "text-ink" : "text-muted")}>
              {flags.post_study_work
                ? "This programme leads to a post-study work route."
                : "This programme hasn't been confirmed to lead to post-study work."}
            </p>
            {flags.pgwp_eligible !== null && (
              <p className="text-body-s text-muted">
                PGWP eligible: {flags.pgwp_eligible ? "yes" : "no"}
              </p>
            )}
            {flags.licensed_student_sponsor !== null && (
              <p className="text-body-s text-muted">
                Licensed student sponsor: {flags.licensed_student_sponsor ? "yes" : "no"}
              </p>
            )}
          </div>
        )}
      </TabPanel>

      {handoffOpen && <HandoffDialog programmeId={id} onClose={() => setHandoffOpen(false)} />}
    </>
  );
}
