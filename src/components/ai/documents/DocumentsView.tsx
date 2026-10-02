"use client";

import { FolderLock } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useDocuments } from "@/lib/ai/documents";
import type { DocumentUpload, StudentDocument } from "@/types";
import { Button } from "../Button";
import { Pill, type Tone } from "../Chip";
import { EmptyState, InlineAlert, Skeleton } from "../feedback";

const STATUS_TONE: Record<string, Tone> = {
  verified: "success",
  pending_review: "info",
  uploaded: "info",
  in_progress: "info",
  rejected: "danger",
  waived: "neutral",
  not_applicable: "neutral",
  not_started: "neutral",
};

const STATUS_LABEL: Record<string, string> = {
  not_started: "Not uploaded",
  in_progress: "In progress",
  uploaded: "Uploaded",
  pending_review: "Waiting for review",
  verified: "Verified",
  rejected: "Needs redoing",
  waived: "Waived",
  not_applicable: "Not applicable",
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function VersionRow({ upload }: { upload: DocumentUpload }) {
  return (
    <li className="flex flex-wrap items-baseline justify-between gap-2 text-body-s">
      <span className="text-muted">
        <span className="font-mono text-caption">v{upload.version}</span> ·{" "}
        {upload.original_filename} · {formatDate(upload.created_at)}
      </span>
      <Pill tone={STATUS_TONE[upload.status] ?? "neutral"}>
        {STATUS_LABEL[upload.status] ?? upload.status}
      </Pill>
    </li>
  );
}

function DocumentCard({ document }: { document: StudentDocument }) {
  const [showHistory, setShowHistory] = useState(false);
  const current = document.current;
  const previousVersions = document.uploads.filter((upload) => upload.id !== current?.id);

  return (
    <li className="rounded-r-md border border-line bg-surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display font-semibold text-ink">{document.title}</h2>
          <p className="mt-0.5 text-body-s text-muted">
            {document.category}
            {current && ` · ${formatBytes(current.size_bytes)}`}
            {current && ` · uploaded ${formatDate(current.created_at)}`}
          </p>
        </div>
        <Pill tone={STATUS_TONE[document.review_status] ?? "neutral"}>
          {STATUS_LABEL[document.review_status] ?? document.review_status}
        </Pill>
      </div>

      {document.review_status === "rejected" && current?.rejection_reason && (
        <div className="mt-3">
          <InlineAlert tone="warning" title="Why it was rejected">
            {current.rejection_reason}
          </InlineAlert>
        </div>
      )}

      {document.is_expired && (
        <p className="mt-3 text-body-s text-warning">
          This document expired{document.expires_on && ` on ${formatDate(document.expires_on)}`}.
          Schools will not accept it, upload a current one.
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-body-s">
        {current?.download_url && (
          <a
            href={current.download_url}
            target="_blank"
            rel="noreferrer"
            className="font-semibold text-accent hover:underline"
          >
            View document
            <span className="sr-only"> {document.title} (opens in a new tab)</span>
          </a>
        )}
        {previousVersions.length > 0 && (
          <button
            type="button"
            onClick={() => setShowHistory((open) => !open)}
            aria-expanded={showHistory}
            className="text-muted underline underline-offset-3"
          >
            {showHistory ? "Hide" : "Show"} earlier versions ({previousVersions.length})
          </button>
        )}
      </div>

      {showHistory && previousVersions.length > 0 && (
        <ul className="mt-4 space-y-2 border-t border-line pt-4">
          {previousVersions.map((upload) => (
            <VersionRow key={upload.id} upload={upload} />
          ))}
        </ul>
      )}
    </li>
  );
}

/** /ai/documents (plan §8.4): every file uploaded against a checklist, across every application. */
export function DocumentsView() {
  const documents = useDocuments();
  const results = documents.data?.results ?? [];
  const expiring = results.filter((doc) => doc.is_expired);

  return (
    <>
      <header className="mb-6">
        <p className="text-overline text-muted uppercase">Documents</p>
        <h1 className="mt-1 font-display text-h1 text-ink">Your document vault</h1>
        <p className="mt-2 text-body text-muted">
          Everything you&apos;ve uploaded, across all your applications. Upload a document once and
          it counts towards every school that asks for it.
        </p>
      </header>

      {expiring.length > 0 && (
        <InlineAlert tone="warning" title="A document needs replacing" className="mb-4">
          {expiring.length === 1
            ? "One of your documents has expired and will need replacing."
            : `${expiring.length} of your documents have expired and will need replacing.`}
        </InlineAlert>
      )}

      {documents.isPending ? (
        <div className="space-y-3" aria-busy="true" aria-label="Loading your documents">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      ) : documents.isError ? (
        <InlineAlert
          tone="danger"
          title="We couldn't load your documents."
          action={
            <Button size="sm" variant="secondary" onClick={() => void documents.refetch()}>
              Try again
            </Button>
          }
        />
      ) : !results.length ? (
        <EmptyState icon={<FolderLock />} title="Nothing uploaded yet">
          Documents you upload against a checklist appear here automatically.{" "}
          <Link
            href="/ai/my-application"
            className="font-semibold text-accent underline underline-offset-3"
          >
            Go to my application
          </Link>
        </EmptyState>
      ) : (
        <ul className="space-y-4" aria-label="Documents">
          {results.map((document) => (
            <DocumentCard key={document.id} document={document} />
          ))}
        </ul>
      )}
    </>
  );
}
