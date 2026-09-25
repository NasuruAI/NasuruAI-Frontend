"use client";

/**
 * Uploader (design-system §8.1): a drop zone on web, with one row per file.
 *
 * This is the view. The caller owns the uploads and passes each file's state;
 * the resumable transport (chunked sessions against /me/uploads/, resume
 * after a drop) lives with the flow that uses it (onboarding, the vault).
 */

import {
  File,
  FileImage,
  FileText,
  Loader2,
  Pause,
  RotateCcw,
  UploadCloud,
  X,
  CircleCheck,
  CircleAlert,
} from "lucide-react";
import { useId, useRef, useState } from "react";
import { cx } from "./cx";

export type UploadStatus = "uploading" | "paused" | "processing" | "done" | "failed";

export type UploadItem = {
  id: string;
  name: string;
  size: number;
  type: string;
  status: UploadStatus;
  /** 0-100 while uploading. */
  progress?: number;
  /** Shown under the row: "We'll read this in the background", or the failure. */
  note?: string;
};

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FileIcon({ type }: { type: string }) {
  const Icon = type.startsWith("image/") ? FileImage : type === "application/pdf" ? FileText : File;
  return <Icon aria-hidden className="size-5 text-muted" />;
}

const STATUS_TEXT: Record<UploadStatus, string> = {
  uploading: "Uploading",
  paused: "Paused: waiting for a connection",
  processing: "Processing",
  done: "Uploaded",
  failed: "Upload failed",
};

export function Uploader({
  label,
  hint,
  accept,
  multiple = true,
  maxBytes,
  items,
  onFiles,
  onRetry,
  onRemove,
  disabled,
}: {
  label: string;
  hint?: string;
  /** e.g. ".pdf,.docx,image/*" */
  accept?: string;
  multiple?: boolean;
  maxBytes?: number;
  items: UploadItem[];
  onFiles: (files: File[]) => void;
  onRetry?: (id: string) => void;
  onRemove?: (id: string) => void;
  disabled?: boolean;
}) {
  const inputId = useId();
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [rejected, setRejected] = useState<string | null>(null);

  function take(list: FileList | null) {
    if (!list || disabled) return;
    const files = Array.from(list);
    const tooBig = maxBytes ? files.filter((file) => file.size > maxBytes) : [];
    setRejected(
      tooBig.length
        ? `${tooBig.map((file) => file.name).join(", ")} ${tooBig.length === 1 ? "is" : "are"} over ${formatBytes(maxBytes ?? 0)}.`
        : null,
    );
    const ok = files.filter((file) => !tooBig.includes(file));
    if (ok.length) onFiles(multiple ? ok : ok.slice(0, 1));
  }

  return (
    <div className="space-y-3">
      <label
        htmlFor={inputId}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          take(event.dataTransfer.files);
        }}
        className={cx(
          "flex cursor-pointer flex-col items-center gap-2 rounded-r-lg border-2 border-dashed px-6 py-8 text-center transition-colors duration-m-fast ease-m",
          "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-focus",
          dragging ? "border-accent bg-accent-soft" : "border-field-line hover:bg-sunken",
          disabled && "cursor-not-allowed opacity-50",
        )}
      >
        <UploadCloud aria-hidden className="size-8 text-muted" />
        <span className="font-semibold text-ink">{label}</span>
        <span className="text-body-s text-muted">
          Drag files here or{" "}
          <span className="text-accent underline underline-offset-3">choose from your device</span>
        </span>
        {hint && <span className="text-caption text-subtle">{hint}</span>}
        <input
          ref={input}
          id={inputId}
          type="file"
          accept={accept}
          multiple={multiple}
          disabled={disabled}
          className="sr-only"
          onChange={(event) => {
            take(event.target.files);
            event.target.value = ""; // choosing the same file again still fires
          }}
        />
      </label>

      {rejected && (
        <p role="alert" className="flex items-start gap-1.5 text-body-s text-danger">
          <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
          {rejected}
        </p>
      )}

      {items.length > 0 && (
        <ul className="divide-y divide-line rounded-r-md border border-line" aria-label="Files">
          {items.map((item) => (
            <li key={item.id} className="flex items-start gap-3 px-4 py-3">
              <FileIcon type={item.type} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-ink">{item.name}</p>
                <p className="text-caption text-muted">
                  {formatBytes(item.size)} · <StatusWord item={item} />
                </p>
                {item.status === "uploading" && (
                  <div
                    role="progressbar"
                    aria-label={`Uploading ${item.name}`}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={item.progress ?? 0}
                    className="mt-2 h-1.5 overflow-hidden rounded-full bg-sunken"
                  >
                    <div
                      className="h-full bg-accent transition-[width] duration-m-base"
                      style={{ width: `${item.progress ?? 0}%` }}
                    />
                  </div>
                )}
                {item.note && (
                  <p
                    className={cx(
                      "mt-1 text-body-s",
                      item.status === "failed" ? "text-danger" : "text-muted",
                    )}
                  >
                    {item.note}
                  </p>
                )}
              </div>
              {item.status === "failed" && onRetry && (
                <button
                  type="button"
                  onClick={() => onRetry(item.id)}
                  className="inline-flex h-9 items-center gap-1 rounded-r-sm px-2 text-body-s font-semibold text-accent hover:bg-accent-soft"
                >
                  <RotateCcw aria-hidden className="size-4" /> Retry
                </button>
              )}
              {onRemove && item.status !== "uploading" && (
                <button
                  type="button"
                  aria-label={`Remove ${item.name}`}
                  onClick={() => onRemove(item.id)}
                  className="flex size-9 items-center justify-center rounded-r-sm text-muted hover:bg-sunken"
                >
                  <X aria-hidden className="size-4" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function StatusWord({ item }: { item: UploadItem }) {
  const icon = {
    uploading: <Loader2 aria-hidden className="inline size-3.5 animate-spin align-[-2px]" />,
    paused: <Pause aria-hidden className="inline size-3.5 align-[-2px]" />,
    processing: <Loader2 aria-hidden className="inline size-3.5 animate-spin align-[-2px]" />,
    done: <CircleCheck aria-hidden className="inline size-3.5 align-[-2px] text-success" />,
    failed: <CircleAlert aria-hidden className="inline size-3.5 align-[-2px] text-danger" />,
  }[item.status];
  return (
    <span className="inline-flex items-center gap-1">
      {icon}
      {STATUS_TEXT[item.status]}
      {item.status === "uploading" && item.progress !== undefined && ` ${item.progress}%`}
    </span>
  );
}
