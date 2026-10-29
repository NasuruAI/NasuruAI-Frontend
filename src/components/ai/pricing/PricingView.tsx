"use client";

import { Check } from "lucide-react";
import Link from "next/link";
import { SkipLink } from "../SkipLink";
import { useState } from "react";
import { type BillingPeriod, type Plan, usePlans } from "@/lib/ai/account";
import { ButtonLink } from "../Button";
import { formatNaira } from "../evidence/format";
import { InlineAlert, Skeleton } from "../feedback";

const PERIODS: { value: BillingPeriod; label: string }[] = [
  { value: "week", label: "Weekly" },
  { value: "month", label: "Monthly" },
  { value: "year", label: "Yearly" },
];

const PERIOD_UNIT: Record<BillingPeriod, string> = {
  week: "/week",
  month: "/month",
  year: "/year",
};

/** The price, pre-discount "full" price, and discount % of a plan for a period. */
function priceFor(plan: Plan, period: BillingPeriod) {
  const num = (v: unknown) => (v == null ? null : Number(v));
  if (period === "week") return { price: num(plan.weekly_price), full: null, discount: 0 };
  if (period === "year")
    return {
      price: num(plan.yearly_price),
      full: num(plan.yearly_full_price),
      discount: num(plan.yearly_discount_percent) ?? 0,
    };
  return {
    price: num(plan.monthly_price),
    full: num(plan.monthly_full_price),
    discount: num(plan.monthly_discount_percent) ?? 0,
  };
}

function planHighlights(plan: Plan): string[] {
  const out: string[] = [];
  const limits = (plan.limits ?? {}) as Record<string, number | null>;
  const packs = limits.answer_pack;
  out.push(
    packs == null
      ? "Unlimited answer packs"
      : `${packs} answer pack${packs === 1 ? "" : "s"} a month`,
  );
  if (limits.cv == null) out.push("Unlimited tailored CVs");
  else if (limits.cv) out.push(`${limits.cv} tailored CVs a month`);
  if (limits.coaching_session) out.push(`${limits.coaching_session} interview sessions a month`);
  const features = (plan.features ?? []) as string[];
  if (features.includes("extension")) out.push("Browser extension");
  if (features.includes("email_tracking")) out.push("Email tracking");
  if (features.includes("priority_alerts")) out.push("Priority alerts");
  return out;
}

export function PricingView() {
  const plans = usePlans();
  const [period, setPeriod] = useState<BillingPeriod>("month");

  const rows = (plans.data ?? []) as Plan[];
  const free = rows.find((p) => p.code === "free");
  const paid = rows.filter((p) => p.purchasable);

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <SkipLink />
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link href="/ai" className="font-display text-h4">
            Nasuru<span className="text-muted"> AI</span>
          </Link>
          <Link href="/ai/login" className="text-body-s font-semibold text-accent hover:underline">
            Sign in
          </Link>
        </div>
      </header>

      <main id="main" className="mx-auto max-w-5xl px-4 py-10 lg:py-14">
        <div className="text-center">
          <h1 className="font-display text-display-xl text-balance leading-[1.05]">
            Simple pricing.
          </h1>
          <p className="mx-auto mt-3 max-w-md text-body-l text-muted">
            Start free. Pay only when it helps. Longer plans cost less.
          </p>
        </div>

        {/* Period toggle */}
        <div className="mt-8 flex justify-center">
          <div
            role="tablist"
            aria-label="Billing period"
            className="inline-flex rounded-full border border-line bg-surface p-1"
          >
            {PERIODS.map((p) => (
              <button
                key={p.value}
                role="tab"
                aria-selected={period === p.value}
                onClick={() => setPeriod(p.value)}
                className={
                  period === p.value
                    ? "rounded-full bg-accent px-4 py-1.5 text-body-s font-semibold text-on-accent"
                    : "rounded-full px-4 py-1.5 text-body-s font-semibold text-muted hover:text-ink"
                }
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {plans.isError ? (
          <InlineAlert tone="danger" title="We couldn't load pricing." className="mt-8" />
        ) : plans.isPending ? (
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <Skeleton className="h-80" />
            <Skeleton className="h-80" />
            <Skeleton className="h-80" />
          </div>
        ) : (
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {free && <FreeCard plan={free} />}
            {paid.map((plan) => (
              <PaidCard key={plan.code} plan={plan} period={period} />
            ))}
          </div>
        )}

        <section className="mt-12 rounded-r-md border border-line bg-surface p-6 text-center">
          <h2 className="font-display text-h3">What we never charge for</h2>
          <p className="mt-2 text-body text-muted">
            Jobs. Introductions. Offers. Those are always free.
          </p>
        </section>
      </main>
    </div>
  );
}

function Highlights({ items }: { items: string[] }) {
  return (
    <ul className="mt-5 space-y-2">
      {items.map((item) => (
        <li key={item} className="flex items-start gap-2 text-body-s">
          <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-success" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function FreeCard({ plan }: { plan: Plan }) {
  return (
    <div className="flex flex-col rounded-r-lg border border-line bg-surface p-6">
      <p className="font-display text-h3">{plan.name}</p>
      <p className="mt-2 text-metric-xl tabular-nums">₦0</p>
      <p className="text-body-s text-muted">free forever</p>
      <Highlights items={planHighlights(plan)} />
      <ButtonLink href="/ai/signup" variant="secondary" className="mt-6">
        Get started
      </ButtonLink>
    </div>
  );
}

function PaidCard({ plan, period }: { plan: Plan; period: BillingPeriod }) {
  const { price, full, discount } = priceFor(plan, period);
  const pro = plan.code === "pro";
  return (
    <div
      className={
        pro
          ? "flex flex-col rounded-r-lg border-2 border-accent bg-surface p-6"
          : "flex flex-col rounded-r-lg border border-line bg-surface p-6"
      }
    >
      <div className="flex items-center justify-between">
        <p className="font-display text-h3">{plan.name}</p>
        {discount > 0 && (
          <span className="rounded-full bg-success-bg px-2.5 py-1 text-caption font-semibold text-success">
            save {Math.round(discount)}%
          </span>
        )}
      </div>
      <p className="mt-2 flex items-baseline gap-2">
        <span className="text-metric-xl tabular-nums">
          {price == null ? "—" : formatNaira(price)}
        </span>
        <span className="text-body-s text-muted">{PERIOD_UNIT[period]}</span>
      </p>
      {full != null && full > (price ?? 0) ? (
        <p className="text-body-s text-subtle">
          <span className="line-through tabular-nums">{formatNaira(full)}</span> at the weekly rate
        </p>
      ) : (
        <p className="text-body-s text-muted">
          billed {period === "week" ? "weekly" : period === "month" ? "monthly" : "yearly"}
        </p>
      )}
      <Highlights items={planHighlights(plan)} />
      <ButtonLink href="/ai/signup" className="mt-6">
        Get {plan.name}
      </ButtonLink>
    </div>
  );
}
