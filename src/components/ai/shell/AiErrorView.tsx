"use client";

/**
 * The route-level error surface (web.md §14): a cause, an action and a
 * copyable code. Rendered by the App Router's `error.tsx` boundaries so a
 * thrown render shows this instead of a blank page, and the shell around it
 * stays usable.
 */

import { RotateCcw } from "lucide-react";
import { useEffect } from "react";
import { Button, ButtonLink } from "@/components/ai/Button";
import { InlineAlert } from "@/components/ai/feedback";

export function AiErrorView({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    // The boundary is the last place the error is still a real object; Sentry
    // (when configured) has already seen it, but the console keeps local
    // debugging honest.
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-[720px] px-4 py-12 md:px-8">
      <h1 className="font-display text-h2">Something went wrong</h1>
      <p className="mt-2 max-w-[60ch] text-body text-muted">
        This page could not finish loading. Nothing you saved has been lost.
      </p>

      <InlineAlert
        className="mt-6"
        tone="danger"
        title="We could not load this page"
        code={error.digest}
        action={
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={retry}>
              <RotateCcw aria-hidden className="size-4" />
              Try again
            </Button>
            <ButtonLink href="/ai" size="sm" variant="secondary">
              Go to the start page
            </ButtonLink>
          </div>
        }
      >
        If it keeps happening, send support the code above and what you were doing.
      </InlineAlert>
    </div>
  );
}
