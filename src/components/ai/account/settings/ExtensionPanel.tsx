"use client";

/**
 * Settings → Extension (web.md §12): pair the browser extension with a
 * 6-digit code, see and revoke paired devices.
 */

import { Plug } from "lucide-react";
import { useState } from "react";
import {
  useExtensionTokens,
  useRequestPairingCode,
  useRevokeExtensionToken,
} from "@/lib/ai/account";
import { Button } from "../../Button";
import { formatDate } from "../../evidence/format";
import { EmptyState, InlineAlert, Skeleton } from "../../feedback";

export function ExtensionPanel() {
  const tokens = useExtensionTokens();
  const pair = useRequestPairingCode();
  const revoke = useRevokeExtensionToken();
  const [code, setCode] = useState<{ code: string; expiresInSeconds: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  function generate() {
    setError(null);
    pair.mutate(undefined, {
      onSuccess: (result) =>
        setCode({ code: result.code, expiresInSeconds: result.expires_in_seconds }),
      onError: () => setError("Couldn't generate a code. Try again."),
    });
  }

  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-h3 text-ink">Pair the browser extension</h2>
        <p className="mt-1 text-body-s text-muted">
          Install the Nasuru AI extension, then enter this code when it asks.
        </p>
        {code ? (
          <div className="mt-3 rounded-r-md border border-line bg-surface p-5 text-center">
            <p className="font-display text-h1 tracking-[0.3em] text-ink">{code.code}</p>
            <p className="mt-2 text-body-s text-muted">
              Expires in {Math.round(code.expiresInSeconds / 60)} minutes
            </p>
          </div>
        ) : (
          <Button
            className="mt-3"
            icon={<Plug aria-hidden className="size-4" />}
            loading={pair.isPending}
            onClick={generate}
          >
            Generate a pairing code
          </Button>
        )}
        {error && <InlineAlert tone="danger" title={error} className="mt-3" />}
      </section>

      <section>
        <h2 className="text-h3 text-ink">Paired devices</h2>
        {tokens.isPending ? (
          <Skeleton className="mt-3 h-24" />
        ) : !tokens.data?.length ? (
          <EmptyState icon={<Plug aria-hidden />} title="Nothing paired yet">
            Pair the extension above to see it here.
          </EmptyState>
        ) : (
          <ul className="mt-3 divide-y divide-line rounded-r-md border border-line">
            {tokens.data.map((token) => (
              <li key={token.id} className="flex items-center justify-between gap-3 p-4">
                <div>
                  <p className="font-semibold text-ink">
                    {token.device_label || "Browser extension"}
                    <span className="ml-2 font-mono text-caption text-subtle">{token.prefix}…</span>
                  </p>
                  <p className="text-body-s text-muted">
                    {token.active ? "Active" : "Expired"} · paired {formatDate(token.created_at)}
                    {token.last_used_at && ` · last used ${formatDate(token.last_used_at)}`}
                  </p>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  loading={revoke.isPending && revoke.variables === token.id}
                  onClick={() => revoke.mutate(token.id)}
                >
                  Revoke
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
