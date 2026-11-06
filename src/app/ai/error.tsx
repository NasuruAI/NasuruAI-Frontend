"use client";

import { AiErrorView } from "@/components/ai/shell/AiErrorView";

export default function AiError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return <AiErrorView error={error} retry={retry} />;
}
