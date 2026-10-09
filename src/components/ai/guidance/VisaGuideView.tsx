"use client";

/**
 * The visa guide (web.md §11.5, web-build F12): a route's steps with
 * checkboxes (the embedded document checklist) and grounded Q&A — the exact
 * same two panels Routes' own detail page shows (F7), reused here.
 */

import { Compass, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouteDetail } from "@/lib/ai/routes";
import { useEligibility } from "@/lib/ai/onboarding";
import { ChecklistPanel, GuideQA } from "./RouteGuide";
import { EmptyState, InlineAlert, Skeleton } from "../feedback";
import { COUNTRY_NAMES } from "../Flag";

export function VisaGuidePicker() {
  const eligibility = useEligibility(true);
  const results = eligibility.data?.results ?? [];

  if (eligibility.isPending) return <Skeleton className="h-40" />;
  if (!results.length) {
    return (
      <EmptyState icon={<Compass aria-hidden />} title="No routes yet">
        Finish onboarding to see routes you can get a visa guide for.
      </EmptyState>
    );
  }
  return (
    <div>
      <h1 className="font-display text-h2 text-ink">Visa guide</h1>
      <p className="mt-1 text-body text-muted">
        Choose a route for its steps and grounded Q&amp;A.
      </p>
      <ul className="mt-6 divide-y divide-line rounded-r-md border border-line">
        {results.map((result) => (
          <li key={result.route.code}>
            <Link
              href={`/ai/visa/${result.route.code}`}
              className="flex items-center justify-between gap-3 p-4 hover:bg-sunken"
            >
              <span>
                <span className="font-semibold text-ink">{result.route.name}</span>
                <span className="ml-2 text-body-s text-muted">
                  {COUNTRY_NAMES[result.route.country] ?? result.route.country}
                </span>
              </span>
              <ShieldCheck aria-hidden className="size-4 shrink-0 text-subtle" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function VisaGuideView({ code }: { code: string }) {
  const route = useRouteDetail(code);

  if (route.isPending) return <Skeleton className="h-60" />;
  if (route.isError || !route.data) {
    return <InlineAlert tone="danger" title="We couldn't find that route." />;
  }

  return (
    <div className="space-y-8">
      <div>
        <Link href="/ai/visa" className="text-body-s text-muted hover:text-ink">
          Visa guide
        </Link>
        <h1 className="font-display text-h2 text-ink">{route.data.name}</h1>
        <p className="mt-1 text-body text-muted">
          {COUNTRY_NAMES[route.data.country] ?? route.data.country}
        </p>
      </div>

      <section>
        <h2 className="text-h3 text-ink">Your steps</h2>
        <div className="mt-3">
          <ChecklistPanel code={code} />
        </div>
      </section>

      <GuideQA code={code} />
    </div>
  );
}
