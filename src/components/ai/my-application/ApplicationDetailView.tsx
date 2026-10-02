"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { useAnnouncer } from "@/components/ui/Announcer";
import { ApiError } from "@/lib/api";
import {
  useMyApplication,
  useMyChecklist,
  useUploadChecklistDocument,
} from "@/lib/ai/my-application";
import type { ChecklistItem } from "@/types";
import { Pill, type Tone } from "../Chip";
import { cx } from "../cx";
import { EmptyState, InlineAlert, ProgressBar, Skeleton } from "../feedback";

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
  not_started: "Not started",
  in_progress: "In progress",
  uploaded: "Uploaded",
  pending_review: "In review",
  verified: "Verified",
  rejected: "Needs attention",
  waived: "Waived",
  not_applicable: "Not applicable",
};

function statusLabel(item: ChecklistItem): string {
  if (item.evidence_type === "task" && item.status === "not_started") return "To do";
  return STATUS_LABEL[item.status] ?? item.status;
}

function ChecklistRow({ item, applicationId }: { item: ChecklistItem; applicationId: string }) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const { announce } = useAnnouncer();
  const upload = useUploadChecklistDocument(applicationId);

  const isTask = item.evidence_type === "task";
  const canUpload = !isTask && item.status !== "verified" && item.status !== "waived";

  function reject(file: File): string | null {
    const maxBytes = item.max_file_size_mb * 1024 * 1024;
    if (file.size > maxBytes) {
      return `This file is too large. The limit is ${item.max_file_size_mb}MB.`;
    }
    const accepted = item.accepted_file_types ?? [];
    if (accepted.length) {
      const extension = `.${file.name.split(".").pop()?.toLowerCase() ?? ""}`;
      if (!accepted.includes(extension)) return `Accepted file types: ${accepted.join(", ")}.`;
    }
    return null;
  }

  function onFile(file: File) {
    const problem = reject(file);
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    announce(`Uploading ${item.label}`);
    upload.mutate(
      { itemId: item.id, file },
      {
        onSuccess: () => announce(`${item.label} uploaded`),
        onError: (err) =>
          setError(
            err instanceof ApiError
              ? (err.fieldErrors.file?.[0] ?? err.message)
              : "That upload didn't go through. Check your connection and try again.",
          ),
        onSettled: () => {
          if (fileInput.current) fileInput.current.value = "";
        },
      },
    );
  }

  return (
    <li className="p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-ink">{item.label}</h3>
            {!item.is_required && <span className="text-caption text-subtle">optional</span>}
            {item.priority === "high" && item.status !== "verified" && (
              <Pill tone="danger">priority</Pill>
            )}
          </div>
          {item.help_text && <p className="mt-1 text-body-s text-muted">{item.help_text}</p>}
          {item.due_date && (
            <p className="mt-1 text-caption text-subtle">
              Due {new Date(item.due_date).toLocaleDateString()}
            </p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <Pill tone={STATUS_TONE[item.status] ?? "neutral"}>{statusLabel(item)}</Pill>
          {canUpload && (
            <>
              <input
                ref={fileInput}
                id={`upload-${item.id}`}
                type="file"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) onFile(file);
                }}
                accept={item.accepted_file_types?.join(",") || undefined}
                className="sr-only"
              />
              <label
                htmlFor={`upload-${item.id}`}
                className={cx(
                  "cursor-pointer rounded-r-sm border border-field-line px-3 py-1.5 text-body-s font-semibold text-muted transition hover:bg-sunken",
                  upload.isPending && "pointer-events-none opacity-50",
                )}
              >
                {item.status === "rejected" ? "Replace" : "Upload"}
                <span className="sr-only"> {item.label}</span>
              </label>
            </>
          )}
        </div>
      </div>

      {upload.isPending && (
        <div className="mt-3">
          <ProgressBar value={1} max={1} label={`Uploading ${item.label}…`} />
        </div>
      )}

      {item.status === "rejected" && item.rejection_reason && (
        <div className="mt-3">
          <InlineAlert tone="warning" title="Needs another look">
            {item.rejection_reason}
          </InlineAlert>
        </div>
      )}

      {error && (
        <p role="alert" className="mt-2 text-caption text-danger">
          {error}
        </p>
      )}
    </li>
  );
}

/** /ai/my-application/[id]: one school's status and its staff-reviewed checklist. */
export function ApplicationDetailView({ id }: { id: string }) {
  const application = useMyApplication(id);
  const checklist = useMyChecklist(id);

  const grouped = useMemo(() => {
    if (!checklist.data) return [];
    const map = new Map<string, ChecklistItem[]>();
    for (const item of checklist.data.items) {
      const bucket = map.get(item.category_slug) ?? [];
      bucket.push(item);
      map.set(item.category_slug, bucket);
    }
    return checklist.data.categories.map((category) => ({
      ...category,
      items: map.get(category.slug) ?? [],
    }));
  }, [checklist.data]);

  if (application.isPending) {
    return (
      <div aria-busy="true" aria-label="Loading your application" className="space-y-3">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  if (application.isError) {
    return (
      <EmptyState icon={<ArrowLeft />} title="We couldn't find that application">
        <Link href="/ai/my-application" className="text-accent underline underline-offset-3">
          Back to my application
        </Link>
      </EmptyState>
    );
  }

  const data = application.data;
  const list = checklist.data;
  const outstanding = list ? list.required_count - list.verified_count : 0;

  return (
    <>
      <Link
        href="/ai/my-application"
        className="mb-4 inline-flex items-center gap-1 text-body-s font-semibold text-accent hover:underline"
      >
        <ArrowLeft aria-hidden className="size-4" /> My application
      </Link>
      <header className="mb-6">
        <h1 className="font-display text-h1 text-balance text-ink">{data.school_name}</h1>
        <p className="mt-2 text-body text-muted">
          {data.programme_name}
          {data.intake && ` · ${data.intake}`} · {data.status_display}
        </p>
      </header>

      {!list ? (
        <InlineAlert tone="info" title="Your checklist is being prepared">
          Your counsellor will have it ready shortly.
        </InlineAlert>
      ) : (
        <div className="space-y-8">
          <section className="rounded-r-md border border-line bg-surface p-5">
            <ProgressBar
              value={list.verified_count}
              max={Math.max(list.required_count, 1)}
              label={`${list.verified_count} of ${list.required_count} required documents verified`}
            />
            {list.percent_uploaded > list.percent_complete && (
              <p className="mt-3 text-caption text-subtle">
                {list.uploaded_count} uploaded · {list.verified_count} verified. The bar counts
                verified documents only, so it moves once our team has checked each one.
              </p>
            )}
            {outstanding === 0 && list.required_count > 0 && (
              <p className="mt-3 text-body-s font-semibold text-success">
                Everything required has been verified.
              </p>
            )}
          </section>

          {grouped.map((category) => (
            <section key={category.slug} className="space-y-3">
              <div className="flex items-baseline justify-between">
                <h2 className="text-h4 text-ink">{category.category}</h2>
                <span className="text-caption text-subtle tabular-nums">
                  {category.verified}/{category.total}
                </span>
              </div>
              <ul className="divide-y divide-line rounded-r-md border border-line">
                {category.items.map((item) => (
                  <ChecklistRow key={item.id} item={item} applicationId={id} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
