"use client";

import { Check, Copy, MessageCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useAnnouncer } from "@/components/ui/Announcer";
import { type PlanResponse, useShareLink } from "@/lib/ai/plan";
import { Button } from "../Button";
import { Dialog } from "../Dialog";
import { InlineAlert } from "../feedback";
import { TextField } from "../fields";

/** The public page a parent or sponsor opens (web.md §13, web-build F15). */
export function shareUrl(token: string, origin = window.location.origin): string {
  return `${origin}/ai/share/${token}`;
}

/**
 * "Share with family": a read-only link to the plan, its costs and progress.
 * One live link at a time; a new link switches the old one off.
 */
export function ShareDialog({
  open,
  onClose,
  share,
  name,
}: {
  open: boolean;
  onClose: () => void;
  share: PlanResponse["share"];
  name: string;
}) {
  const { announce } = useAnnouncer();
  const { create, revoke } = useShareLink();
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  const url = share ? shareUrl(share.token) : "";
  const failed = () => setError("That didn't work. Check your connection and try again.");

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      announce("Link copied");
    } catch {
      announce("Couldn't copy. Select the link and copy it instead.", true);
    }
  }

  const message = `${name}'s relocation plan on Nasuru AI: ${url}`;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Share with family"
      description="A read-only page for a parent or sponsor: your plan, what it costs in naira and how far you've got."
      footer={
        share ? (
          <>
            <Button
              variant="tertiary"
              loading={revoke.isPending}
              onClick={() => {
                setError(null);
                revoke.mutate(undefined, { onError: failed });
              }}
            >
              Stop sharing
            </Button>
            <Button
              variant="secondary"
              loading={create.isPending}
              onClick={() => {
                setError(null);
                create.mutate(undefined, { onError: failed });
              }}
            >
              Make a new link
            </Button>
          </>
        ) : (
          <Button
            loading={create.isPending}
            onClick={() => {
              setError(null);
              create.mutate(undefined, { onError: failed });
            }}
          >
            Create link
          </Button>
        )
      }
    >
      <div className="space-y-4">
        {error && <InlineAlert tone="danger" title={error} />}
        <ul className="list-disc space-y-1 pl-5 text-body text-muted">
          <li>
            They see your pathway, costs, deadlines and which applications are at which stage.
          </li>
          <li>They never see your documents, answers or personal details.</li>
          <li>You can stop sharing at any time; the link then stops working.</li>
        </ul>
        {share && (
          <>
            <div className="flex items-end gap-2">
              <TextField
                label="Link"
                readOnly
                value={url}
                className="min-w-0 flex-1"
                onFocus={(e) => e.target.select()}
              />
              <Button
                variant="secondary"
                onClick={copy}
                icon={
                  copied ? (
                    <Check aria-hidden className="size-4 text-success" />
                  ) : (
                    <Copy aria-hidden className="size-4" />
                  )
                }
              >
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(message)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-body font-semibold text-accent underline underline-offset-3"
            >
              <MessageCircle aria-hidden className="size-4" />
              Send on WhatsApp
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
            <p className="text-body-s text-muted">
              Opened {share.views} time{share.views === 1 ? "" : "s"}.
            </p>
          </>
        )}
      </div>
    </Dialog>
  );
}
