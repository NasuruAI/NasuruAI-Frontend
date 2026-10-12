"use client";

/**
 * Settings → Your data (web.md §12): export everything Nasuru AI holds, or
 * erase it. Erasure is irreversible, so it asks for a password and the
 * exact phrase before it does anything.
 */

import { Download, ShieldAlert } from "lucide-react";
import { useState } from "react";
import { ApiError } from "@/lib/api";
import {
  downloadExport,
  useDataExports,
  useRequestErasure,
  useRequestExport,
} from "@/lib/ai/account";
import { Button } from "../../Button";
import { ConfirmDialog } from "../../Dialog";
import { formatBytes } from "../../Uploader";
import { formatDate } from "../../evidence/format";
import { InlineAlert, Skeleton } from "../../feedback";
import { TextField } from "../../fields";

const STATUS_LABEL: Record<string, string> = {
  pending: "Preparing…",
  ready: "Ready",
  failed: "Failed",
};

function ErasureDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const erase = useRequestErasure();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function submit() {
    setError(null);
    erase.mutate(
      { password, confirm },
      {
        onSuccess: () => setDone(true),
        onError: (err) =>
          setError(err instanceof ApiError ? err.message : "That didn't work. Try again."),
      },
    );
  }

  if (done) {
    return (
      <ConfirmDialog
        open={open}
        onClose={onClose}
        onConfirm={onClose}
        title="Your data is being erased"
        description="Your files are now unreadable. Everything is deleted within minutes."
        confirmLabel="Done"
      />
    );
  }

  return (
    <ConfirmDialog
      open={open}
      onClose={onClose}
      onConfirm={submit}
      title="Erase your Nasuru AI data"
      description="This can't be undone. Your profile, documents, applications and everything else built from them are deleted."
      confirmLabel="Erase everything"
      destructive
      loading={erase.isPending}
    >
      <div className="space-y-3">
        <TextField
          label="Your password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        <TextField
          label='Type "DELETE MY DATA" to confirm'
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
        />
        {error && <InlineAlert tone="danger" title={error} />}
      </div>
    </ConfirmDialog>
  );
}

export function DataPanel() {
  const exports = useDataExports();
  const requestExport = useRequestExport();
  const [erasing, setErasing] = useState(false);

  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-h3 text-ink">Export your data</h2>
        <p className="mt-1 text-body-s text-muted">
          Everything Nasuru AI holds about you, as a download. Ready within a few minutes.
        </p>
        <Button
          className="mt-3"
          icon={<Download aria-hidden className="size-4" />}
          loading={requestExport.isPending}
          onClick={() => requestExport.mutate()}
        >
          Request an export
        </Button>
        {exports.isPending ? (
          <Skeleton className="mt-4 h-16" />
        ) : exports.data && exports.data.length > 0 ? (
          <ul className="mt-4 divide-y divide-line rounded-r-md border border-line">
            {exports.data.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3 p-4">
                <div>
                  <p className="font-semibold text-ink">
                    {STATUS_LABEL[item.status] ?? item.status}
                  </p>
                  <p className="text-body-s text-muted">
                    {formatDate(item.created_at)}
                    {item.size_bytes !== null && ` · ${formatBytes(item.size_bytes)}`}
                  </p>
                </div>
                {item.status === "ready" && (
                  <Button variant="secondary" size="sm" onClick={() => downloadExport(item.id)}>
                    Download
                  </Button>
                )}
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <section>
        <h2 className="text-h3 text-ink">Erase your data</h2>
        <p className="mt-1 text-body-s text-muted">
          Deletes your Nasuru AI profile, documents and everything built from them. This can&apos;t
          be undone.
        </p>
        <Button
          className="mt-3"
          variant="danger"
          icon={<ShieldAlert aria-hidden className="size-4" />}
          onClick={() => setErasing(true)}
        >
          Erase my data
        </Button>
      </section>

      <ErasureDialog open={erasing} onClose={() => setErasing(false)} />
    </div>
  );
}
