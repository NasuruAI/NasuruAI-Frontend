"use client";

/**
 * Settings → Connections (US-504, web.md §12): a read-only link to Gmail,
 * so an application's emails can suggest a board move — never acted on
 * without the candidate's own Accept.
 */

import { Mail, RefreshCcw } from "lucide-react";
import { useState } from "react";
import { useAnnouncer } from "@/components/ui/Announcer";
import {
  useConnectInbox,
  useDisconnectInbox,
  useInboxConnection,
  useSyncInbox,
} from "@/lib/ai/account";
import { Button } from "../../Button";
import { Pill } from "../../Chip";
import { formatDate } from "../../evidence/format";
import { InlineAlert, Skeleton } from "../../feedback";

const STATUS_LABEL: Record<string, { label: string; tone: "success" | "danger" | "warning" }> = {
  active: { label: "Connected", tone: "success" },
  revoked: { label: "Access withdrawn at Google", tone: "danger" },
  error: { label: "Having trouble", tone: "warning" },
};

export function ConnectionsPanel() {
  const connection = useInboxConnection();
  const connect = useConnectInbox();
  const disconnect = useDisconnectInbox();
  const sync = useSyncInbox();
  const { announce } = useAnnouncer();
  const [error, setError] = useState<string | null>(null);

  function start() {
    setError(null);
    connect.mutate(undefined, {
      onSuccess: (result) => {
        window.location.href = result.authorization_url;
      },
      onError: () => setError("Gmail connection isn't set up yet. Try again later."),
    });
  }

  if (connection.isPending) return <Skeleton className="h-40" />;

  return (
    <div>
      <h2 className="text-h3 text-ink">Gmail</h2>
      <p className="mt-1 text-body-s text-muted">
        Read-only. We only look for application emails to suggest a move on your board — you always
        choose Accept or Dismiss, nothing moves on its own.
      </p>
      {error && <InlineAlert tone="danger" title={error} className="mt-3" />}

      <div className="mt-4 rounded-r-md border border-line p-5">
        {!connection.data ? (
          <>
            <p className="text-body text-muted">Not connected.</p>
            <Button
              className="mt-3"
              icon={<Mail aria-hidden className="size-4" />}
              loading={connect.isPending}
              onClick={start}
            >
              Connect Gmail
            </Button>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-ink">{connection.data.email_address}</p>
                <p className="text-body-s text-muted">
                  Last synced{" "}
                  {connection.data.last_synced_at
                    ? formatDate(connection.data.last_synced_at)
                    : "never yet"}
                </p>
              </div>
              <Pill tone={STATUS_LABEL[connection.data.status]?.tone ?? "neutral"}>
                {STATUS_LABEL[connection.data.status]?.label ?? connection.data.status}
              </Pill>
            </div>
            {connection.data.last_error && (
              <InlineAlert tone="warning" title={connection.data.last_error} className="mt-3" />
            )}
            <div className="mt-4 flex gap-2">
              <Button
                variant="secondary"
                icon={<RefreshCcw aria-hidden className="size-4" />}
                loading={sync.isPending}
                onClick={() =>
                  sync.mutate(undefined, {
                    onSuccess: (result) => announce(`${result.suggestions} new suggestion(s)`),
                  })
                }
              >
                Sync now
              </Button>
              <Button
                variant="danger"
                loading={disconnect.isPending}
                onClick={() => disconnect.mutate()}
              >
                Disconnect
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
