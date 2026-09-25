"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { resumeStep, stepHref, useOccupation } from "@/lib/ai/onboarding";
import { useMe } from "@/lib/ai/shell";
import { Skeleton } from "../feedback";

export function ResumeOnboarding() {
  const router = useRouter();
  const me = useMe();
  const occupation = useOccupation();

  useEffect(() => {
    if (!me.data || occupation.isPending) return;
    const step = resumeStep(me.data, Boolean(occupation.data));
    router.replace(step === "done" ? "/ai/plan" : stepHref(step));
  }, [me.data, occupation.isPending, occupation.data, router]);

  return (
    <div aria-busy="true" aria-label="Loading" className="space-y-3">
      <Skeleton className="h-8 w-2/3" />
      <Skeleton className="h-40 w-full" />
    </div>
  );
}
