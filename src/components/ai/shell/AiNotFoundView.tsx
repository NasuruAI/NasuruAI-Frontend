/**
 * The route-level 404 (web.md §14): one sentence and one action, never a dead
 * end. Used by both the public and signed-in `/ai` trees.
 */

import { Compass } from "lucide-react";
import { ButtonLink } from "@/components/ai/Button";
import { EmptyState } from "@/components/ai/feedback";

export function AiNotFoundView() {
  return (
    <div className="mx-auto max-w-[720px] px-4 py-16 md:px-8">
      <h1 className="sr-only">Page not found</h1>
      <EmptyState
        icon={<Compass aria-hidden />}
        title="We could not find that page"
        action={
          <ButtonLink href="/ai" variant="secondary">
            Go to the start page
          </ButtonLink>
        }
      >
        The link may be old, or the page may have moved. Your plan and applications are still where
        you left them.
      </EmptyState>
    </div>
  );
}
