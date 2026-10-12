"use client";

/**
 * /ai/billing/callback: the server-chosen redirect after checkout
 * (apps/billing/views.py CheckoutView). Polls until the gateway's webhook
 * confirms, the same way the agency's own payment callback does — nothing
 * is "Paid" until a signature-verified webhook says so.
 */

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { verifyPayment, type Payment } from "@/lib/ai/account";
import { useQueryClient } from "@tanstack/react-query";
import { Button, ButtonLink } from "../Button";
import { Skeleton } from "../feedback";

const POLL_MS = 3000;
const MAX_POLLS = 10;

export function BillingCallback() {
  const params = useSearchParams();
  const router = useRouter();
  const client = useQueryClient();
  const [status, setStatus] = useState<Payment["status"] | "unknown">("unknown");
  const reference = params.get("reference") ?? params.get("tx_ref") ?? "";

  useEffect(() => {
    if (!reference) {
      router.replace("/ai/billing");
      return;
    }
    let cancelled = false;
    const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    void (async () => {
      for (let attempt = 0; attempt < MAX_POLLS && !cancelled; attempt++) {
        try {
          const payment = await verifyPayment(reference);
          if (cancelled) return;
          setStatus(payment.status);
          if (payment.status === "successful") {
            void client.invalidateQueries({ queryKey: ["ai", "entitlements"] });
            return;
          }
          if (payment.status !== "pending" && payment.status !== "processing") return;
        } catch {
          if (!cancelled) setStatus("unknown");
          return;
        }
        await sleep(POLL_MS);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [reference, client, router]);

  if (!reference) return null;

  if (status === "successful") {
    return (
      <div className="mx-auto max-w-md px-6 py-20 text-center">
        <h1 className="font-display text-h2 text-ink">Payment confirmed</h1>
        <p className="mt-2 text-body text-muted">Your plan is active.</p>
        <ButtonLink href="/ai/billing" className="mt-8">
          Back to billing
        </ButtonLink>
      </div>
    );
  }

  if (status === "failed" || status === "abandoned") {
    return (
      <div className="mx-auto max-w-md px-6 py-20 text-center">
        <h1 className="font-display text-h2 text-ink">That payment didn&apos;t go through</h1>
        <p className="mt-2 text-body text-muted">
          Nothing was charged. Try again with the same plan.
        </p>
        <ButtonLink href="/ai/billing" className="mt-8">
          Back to billing
        </ButtonLink>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-6 py-20 text-center">
      <h1 className="font-display text-h2 text-ink">Confirming your payment</h1>
      <p className="mt-2 text-body text-muted">This usually takes a few seconds.</p>
      <Skeleton className="mx-auto mt-8 h-11 w-40" />
      <Button variant="tertiary" className="mt-6" onClick={() => router.push("/ai/billing")}>
        I&apos;ll check later
      </Button>
    </div>
  );
}
