import { Suspense } from "react";
import { BillingCallback } from "@/components/ai/account/BillingCallback";
import { Skeleton } from "@/components/ai/feedback";

export const metadata = { title: "Confirming payment · Nasuru AI" };

export default function BillingCallbackPage() {
  return (
    <Suspense fallback={<Skeleton className="h-60" />}>
      <BillingCallback />
    </Suspense>
  );
}
