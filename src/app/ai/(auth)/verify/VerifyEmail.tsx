"use client";

import { useEffect, useRef, useState } from "react";
import { InlineAlert, Skeleton, TextLink } from "@/components/ai";
import { AuthFrame } from "@/components/ai/auth/AuthFrame";
import { ApiError } from "@/lib/api";
import { verifyEmail } from "@/lib/auth/client";
import { useSession } from "@/lib/auth/SessionProvider";

type State = { kind: "checking" } | { kind: "done" } | { kind: "failed"; message: string };

export function VerifyEmail() {
  const { session, refresh } = useSession();
  const [state, setState] = useState<State>({ kind: "checking" });
  // A token is single-use: under Strict Mode's double effect, send it once.
  const sent = useRef(false);

  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    const token = new URLSearchParams(window.location.search).get("token") ?? "";
    void (async () => {
      try {
        await verifyEmail(token);
        setState({ kind: "done" });
        await refresh();
      } catch (err) {
        setState({
          kind: "failed",
          message:
            err instanceof ApiError
              ? err.message
              : "We couldn't reach Nasuru AI. Check your connection and reload this page.",
        });
      }
    })();
  }, [refresh]);

  return (
    <AuthFrame title="Confirm your email">
      <div aria-live="polite">
        {state.kind === "checking" && (
          <div aria-busy="true" className="space-y-2">
            <p className="text-body text-muted">Checking your link…</p>
            <Skeleton className="h-4 w-2/3" />
          </div>
        )}
        {state.kind === "done" && (
          <div className="space-y-5">
            <InlineAlert tone="success" title="Email confirmed">
              We&apos;ll send reminders and receipts there.
            </InlineAlert>
            <TextLink href={session ? "/ai/plan" : "/ai/login"} standalone>
              {session ? "Go to your plan" : "Sign in"}
            </TextLink>
          </div>
        )}
        {state.kind === "failed" && (
          <InlineAlert tone="danger" title={state.message}>
            {session
              ? "Ask for a new link from the banner at the top of your plan."
              : "Sign in, then ask for a new link from the banner at the top of your plan."}
          </InlineAlert>
        )}
      </div>
    </AuthFrame>
  );
}
