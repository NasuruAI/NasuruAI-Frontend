"use client";

/**
 * Billing (web.md §12 "/billing"): the plan, usage, invoices and a
 * same-page cancel (principle J1 — no hunting for the button, no dark
 * pattern on the way out).
 */

import { useState } from "react";
import { ApiError } from "@/lib/api";
import { useCancelSubscription, useCheckout, usePayments, usePlans } from "@/lib/ai/account";
import { useEntitlements } from "@/lib/ai/shell";
import { Button } from "../Button";
import { ConfirmDialog } from "../Dialog";
import { formatNaira } from "../evidence/format";
import { QuotaMeter } from "../evidence/Status";
import { InlineAlert, Skeleton } from "../feedback";

const METER_LABEL: Record<string, string> = {
  answer_pack: "answer packs",
  cv: "tailored CVs",
  coaching_session: "interview practice sessions",
};

const PAYMENT_STATUS_LABEL: Record<string, string> = {
  successful: "Paid",
  pending: "Pending",
  processing: "Processing",
  failed: "Failed",
};

export function BillingView() {
  const entitlements = useEntitlements();
  const plans = usePlans();
  const payments = usePayments();
  const checkout = useCheckout();
  const cancel = useCancelSubscription();
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (entitlements.isPending) return <Skeleton className="h-60" />;
  if (entitlements.isError || !entitlements.data) {
    return <InlineAlert tone="danger" title="We couldn't load your plan." />;
  }
  const data = entitlements.data;
  const currentPlan = plans.data?.find((plan) => plan.code === data.plan.code);

  function upgrade(code: string) {
    setError(null);
    checkout.mutate(code, {
      onSuccess: (result) => {
        window.location.href = result.checkout_url;
      },
      onError: (err) =>
        setError(err instanceof ApiError ? err.message : "Checkout didn't start. Try again."),
    });
  }

  function confirmCancel() {
    setError(null);
    cancel.mutate(undefined, {
      onSuccess: () => setCancelling(false),
      onError: (err) =>
        setError(err instanceof ApiError ? err.message : "Couldn't cancel. Try again."),
    });
  }

  return (
    <div className="space-y-8">
      <h1 className="font-display text-h2 text-ink">Billing</h1>

      <section className="rounded-r-md border border-line bg-surface p-5">
        <p className="text-overline text-muted uppercase">Current plan</p>
        <p className="mt-1 font-display text-h3 text-ink">{data.plan.name}</p>
        {currentPlan?.price_amount && (
          <p className="mt-1 text-body text-muted">
            {formatNaira(Number(currentPlan.price_amount))}
            {(currentPlan.period as string) !== "lifetime" && ` / ${currentPlan.period}`}
            {!currentPlan.auto_renew && " · doesn't renew"}
          </p>
        )}
        {data.subscription && (
          <p className="mt-2 text-body-s text-muted">
            {data.subscription.cancelled
              ? "Cancelled — active until the period ends."
              : data.subscription.auto_renew
                ? "Renews automatically."
                : "Won't renew."}
          </p>
        )}
        {error && <InlineAlert tone="danger" title={error} className="mt-3" />}
        <div className="mt-4 flex flex-wrap gap-2">
          {data.subscription && !data.subscription.cancelled && (
            <Button variant="danger" onClick={() => setCancelling(true)}>
              Cancel subscription
            </Button>
          )}
        </div>
      </section>

      <section>
        <h2 className="text-h3 text-ink">What&apos;s included</h2>
        <div className="mt-3 space-y-3">
          {Object.entries(data.meters).map(([meter, usage]) => (
            <QuotaMeter
              key={meter}
              used={usage.used}
              limit={usage.limit}
              noun={METER_LABEL[meter] ?? meter}
            />
          ))}
        </div>
      </section>

      {plans.data &&
        plans.data.some((plan) => plan.purchasable && plan.code !== data.plan.code) && (
          <section>
            <h2 className="text-h3 text-ink">Other plans</h2>
            <ul className="mt-3 grid gap-3 sm:grid-cols-2">
              {plans.data
                .filter((plan) => plan.purchasable && plan.code !== data.plan.code)
                .map((plan) => (
                  <li key={plan.code} className="rounded-r-md border border-line p-4">
                    <p className="font-semibold text-ink">{plan.name}</p>
                    {plan.tagline && <p className="text-body-s text-muted">{plan.tagline}</p>}
                    {plan.price_amount && (
                      <p className="mt-1 text-body text-ink">
                        {formatNaira(Number(plan.price_amount))}
                      </p>
                    )}
                    <Button
                      size="sm"
                      className="mt-3"
                      loading={checkout.isPending && checkout.variables === plan.code}
                      onClick={() => upgrade(plan.code)}
                    >
                      Choose this plan
                    </Button>
                  </li>
                ))}
            </ul>
          </section>
        )}

      <section>
        <h2 className="text-h3 text-ink">Invoices</h2>
        {payments.isPending ? (
          <Skeleton className="mt-3 h-24" />
        ) : !payments.data?.length ? (
          <p className="mt-2 text-body-s text-muted">No payments yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-line rounded-r-md border border-line">
            {payments.data.map((payment) => (
              <li key={payment.id} className="flex items-center justify-between gap-3 p-4">
                <div>
                  <p className="font-semibold text-ink">{payment.purpose_display}</p>
                  <p className="text-body-s text-muted">
                    {payment.paid_at
                      ? new Date(payment.paid_at).toLocaleDateString("en-GB")
                      : "Not paid"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-ink">{formatNaira(Number(payment.amount))}</p>
                  <p className="text-body-s text-muted">
                    {PAYMENT_STATUS_LABEL[payment.status] ?? payment.status_display}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <ConfirmDialog
        open={cancelling}
        onClose={() => setCancelling(false)}
        onConfirm={confirmCancel}
        title="Cancel your subscription?"
        description="You'll keep access until the end of the current period. No refund for time already used."
        confirmLabel="Cancel subscription"
        cancelLabel="Keep it"
        destructive
        loading={cancel.isPending}
      />
    </div>
  );
}
