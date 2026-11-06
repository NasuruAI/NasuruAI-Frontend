"use client";

import { AiErrorView } from "@/components/ai/shell/AiErrorView";

/**
 * Errors inside the signed-in shell keep the rail and top bar, so the person
 * can move somewhere else instead of being trapped on the broken page.
 */
export default function AiAppError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return <AiErrorView error={error} retry={retry} />;
}
