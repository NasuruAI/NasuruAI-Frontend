/**
 * The route-level loading skeleton (web.md §14). Matches the shape of a page
 * rather than showing a spinner, so the layout does not jump when data lands.
 */

import { Skeleton } from "@/components/ai/feedback";

export function AiLoading({ label = "Loading" }: { label?: string }) {
  return (
    <div className="mx-auto max-w-[1200px] px-4 py-8 md:px-8" aria-busy="true" aria-label={label}>
      <Skeleton className="h-8 w-2/5" />
      <Skeleton className="mt-3 h-4 w-3/5" />
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
      <Skeleton className="mt-4 h-64 w-full" />
    </div>
  );
}
