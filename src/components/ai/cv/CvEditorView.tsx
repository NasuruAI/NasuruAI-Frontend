"use client";

import { ArrowLeft, ChevronDown, ChevronUp, Download, FileWarning, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ApiError } from "@/lib/api";
import {
  cvContent,
  type CvContent,
  letterContent,
  SECTION_KEYS,
  SECTION_LABELS,
  type SectionKey,
  useDeleteDocument,
  useDocumentFormats,
  useEditDocumentText,
  useReorderSections,
} from "@/lib/ai/cv";
import { downloadDocument, useDocument } from "@/lib/ai/packs";
import { Button } from "../Button";
import { EmptyState, InlineAlert, Skeleton } from "../feedback";
import { TextArea } from "../fields";
import { CvRoleEditor } from "./CvBulletEditor";
import { CvPreview } from "./CvPreview";

function move<T>(items: T[], from: number, to: number): T[] {
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

/** Drag-reorder the CV's sections (web.md §9), by accessible up/down buttons. */
function SectionOrderEditor({ documentId, order }: { documentId: string; order: SectionKey[] }) {
  const reorder = useReorderSections();
  const [error, setError] = useState<string | null>(null);

  function onMove(from: number, to: number) {
    setError(null);
    reorder.mutate(
      { id: documentId, order: move(order, from, to) },
      { onError: (err) => setError(err instanceof ApiError ? err.message : "That didn't save.") },
    );
  }

  return (
    <div className="rounded-r-md border border-line p-3">
      <h2 className="mb-2 text-h4 text-ink">Section order</h2>
      <ol className="space-y-1">
        {order.map((key, index) => (
          <li
            key={key}
            className="flex items-center justify-between gap-2 rounded-r-sm bg-sunken px-3 py-1.5"
          >
            <span className="text-body-s font-semibold text-ink">{SECTION_LABELS[key]}</span>
            <span className="flex gap-0.5">
              <button
                type="button"
                aria-label={`Move ${SECTION_LABELS[key]} up`}
                disabled={index === 0}
                onClick={() => onMove(index, index - 1)}
                className="flex size-7 items-center justify-center rounded-r-sm text-muted hover:bg-surface disabled:opacity-30"
              >
                <ChevronUp aria-hidden className="size-4" />
              </button>
              <button
                type="button"
                aria-label={`Move ${SECTION_LABELS[key]} down`}
                disabled={index === order.length - 1}
                onClick={() => onMove(index, index + 1)}
                className="flex size-7 items-center justify-center rounded-r-sm text-muted hover:bg-surface disabled:opacity-30"
              >
                <ChevronDown aria-hidden className="size-4" />
              </button>
            </span>
          </li>
        ))}
      </ol>
      {error && (
        <p role="alert" className="mt-1 text-body-s text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

/** A confirmed-facts block with nothing to edit here (education, skills…). */
function ReadOnlySection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-r-md border border-line p-4">
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <h2 className="text-h4 text-ink">{title}</h2>
        <Link
          href="/ai/start/facts"
          className="text-caption font-semibold text-accent underline underline-offset-3"
        >
          Edit in your facts
        </Link>
      </div>
      <div className="text-body-s text-ink">{children}</div>
    </div>
  );
}

function TextEditor({
  documentId,
  label,
  value,
  onSaved,
}: {
  documentId: string;
  label: string;
  value: string;
  onSaved?: () => void;
}) {
  const edit = useEditDocumentText();
  const [draft, setDraft] = useState(value);
  const [error, setError] = useState<string | null>(null);
  const dirty = draft !== value;

  return (
    <div className="rounded-r-md border border-line p-4">
      <TextArea
        label={label}
        rows={6}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
      />
      {error && (
        <p role="alert" className="mt-1 text-body-s text-danger">
          {error}
        </p>
      )}
      <div className="mt-2 flex items-center gap-2">
        <Button
          size="sm"
          disabled={!dirty}
          loading={edit.isPending}
          onClick={() => {
            setError(null);
            edit.mutate(
              { id: documentId, value: draft },
              {
                onSuccess: () => onSaved?.(),
                onError: (err) =>
                  setError(err instanceof ApiError ? err.message : "That didn't save."),
              },
            );
          }}
        >
          Save
        </Button>
        {dirty && (
          <Button size="sm" variant="tertiary" onClick={() => setDraft(value)}>
            Undo changes
          </Button>
        )}
        {!dirty && edit.isSuccess && <span className="text-body-s text-muted">Saved</span>}
      </div>
    </div>
  );
}

function CvSectionEditor({
  documentId,
  section,
  content,
}: {
  documentId: string;
  section: SectionKey;
  content: CvContent;
}) {
  switch (section) {
    case "summary":
      return <TextEditor documentId={documentId} label="Profile summary" value={content.summary} />;
    case "experience":
      return content.experience.length ? (
        <div className="space-y-3">
          <h2 className="text-h4 text-ink">Experience</h2>
          {content.experience.map((role, index) => (
            <CvRoleEditor key={index} documentId={documentId} role={role} roleIndex={index} />
          ))}
        </div>
      ) : null;
    case "education":
      return content.education.length ? (
        <ReadOnlySection title="Education">
          <ul className="space-y-1">
            {content.education.map((item, index) => (
              <li key={index}>
                {item.qualification} — {item.institution}
                {item.dates ? `, ${item.dates}` : ""}
              </li>
            ))}
          </ul>
        </ReadOnlySection>
      ) : null;
    case "skills":
      return content.skills.length ? (
        <ReadOnlySection title="Skills">{content.skills.join(", ")}</ReadOnlySection>
      ) : null;
    case "certifications":
      return content.certifications.length ? (
        <ReadOnlySection title="Certifications">
          <ul className="list-disc space-y-0.5 pl-4">
            {content.certifications.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </ReadOnlySection>
      ) : null;
    case "languages":
      return content.languages.length ? (
        <ReadOnlySection title="Languages">{content.languages.join(", ")}</ReadOnlySection>
      ) : null;
    default:
      return null;
  }
}

/** /ai/cv/[id] (web.md §9): the editor and its live preview, side by side at lg. */
export function CvEditorView({ id }: { id: string }) {
  const router = useRouter();
  const document = useDocument(id);
  const formats = useDocumentFormats();
  const remove = useDeleteDocument();
  const [downloadError, setDownloadError] = useState<string | null>(null);

  if (document.isPending) {
    return (
      <div aria-busy="true" aria-label="Loading" className="space-y-3">
        <Skeleton className="h-10 w-2/3" />
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
          <Skeleton className="h-96 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }
  if (document.isError || document.data.status !== "ready" || !document.data.content) {
    return (
      <EmptyState icon={<FileWarning />} title="This document isn't ready">
        {document.data?.status === "queued"
          ? "It's still being written. Check back in a moment."
          : "It may have been removed."}{" "}
        <Link href="/ai/cv" className="text-accent underline underline-offset-3">
          Your CV and cover letters
        </Link>
      </EmptyState>
    );
  }

  const data = document.data;
  const cv = cvContent(data);
  const letter = letterContent(data);
  const rules = formats.data?.find((format) => format.country === data.country)?.rules ?? [];
  const title = data.job ? `${data.kind_label} for ${data.job_title}` : `Master ${data.kind_label}`;

  async function download(format: "pdf" | "docx") {
    setDownloadError(null);
    try {
      await downloadDocument(data, format);
    } catch (err) {
      setDownloadError(err instanceof ApiError ? err.message : "That download didn't work.");
    }
  }

  return (
    <>
      <Link
        href="/ai/cv"
        className="mb-4 inline-flex items-center gap-1 text-body-s font-semibold text-accent hover:underline"
      >
        <ArrowLeft aria-hidden className="size-4" /> Your CV and cover letters
      </Link>
      <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-h1 text-balance text-ink">{title}</h1>
          <p className="mt-1 text-body-s text-muted">
            {data.format_title} · {data.country}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="secondary"
            icon={<Download aria-hidden className="size-4" />}
            onClick={() => void download("pdf")}
          >
            PDF
          </Button>
          <Button
            size="sm"
            variant="tertiary"
            icon={<Download aria-hidden className="size-4" />}
            onClick={() => void download("docx")}
          >
            Word
          </Button>
          <Button
            size="sm"
            variant="tertiary"
            icon={<Trash2 aria-hidden className="size-4" />}
            onClick={() => {
              if (!window.confirm(`Delete this ${data.kind_label.toLowerCase()}?`)) return;
              remove.mutate(id, { onSuccess: () => router.push("/ai/cv") });
            }}
          >
            Delete
          </Button>
        </div>
      </header>

      {downloadError && <InlineAlert tone="danger" title={downloadError} className="mb-4" />}
      {data.guidance && (
        <InlineAlert
          tone={data.over_length ? "warning" : "info"}
          title={data.guidance}
          className="mb-4"
        />
      )}
      {rules.length > 0 && (
        <p className="mb-6 text-body-s text-muted">
          <span className="font-semibold text-ink">{data.country}: </span>
          {rules.join(" · ")}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="space-y-4">
          {cv ? (
            <>
              <SectionOrderEditor
                documentId={id}
                order={cv.section_order.length ? cv.section_order : SECTION_KEYS}
              />
              {(cv.section_order.length ? cv.section_order : SECTION_KEYS).map((section) => (
                <CvSectionEditor key={section} documentId={id} section={section} content={cv} />
              ))}
            </>
          ) : letter ? (
            <TextEditor
              documentId={id}
              label="The letter's body"
              value={letter.paragraphs.join("\n\n")}
            />
          ) : null}
        </div>
        <div>
          {(cv || letter) && (
            <CvPreview
              content={(cv ?? letter) as never}
              pages={data.pages ?? null}
              overLength={Boolean(data.over_length)}
            />
          )}
        </div>
      </div>
    </>
  );
}
