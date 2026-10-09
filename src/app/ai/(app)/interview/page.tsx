import { Suspense } from "react";
import { InterviewHome } from "@/components/ai/interview/InterviewHome";
import { Skeleton } from "@/components/ai/feedback";

export const metadata = { title: "Interview practice · Nasuru AI" };

export default function InterviewPage() {
  return (
    <Suspense fallback={<Skeleton className="h-60" />}>
      <InterviewHome />
    </Suspense>
  );
}
