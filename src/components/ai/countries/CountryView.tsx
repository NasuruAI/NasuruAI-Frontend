"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { SkipLink } from "../SkipLink";
import { ai, unwrap } from "@/lib/ai/client";
import type { components } from "@/lib/ai/schema";
import { ButtonLink } from "../Button";
import { EmptyState, InlineAlert, Skeleton } from "../feedback";

type RouteSummary = components["schemas"]["RouteSummary"];

const COUNTRY_NAME: Record<string, string> = {
  DE: "Germany",
  GB: "the United Kingdom",
  CA: "Canada",
  IE: "Ireland",
  NL: "the Netherlands",
  CH: "Switzerland",
  US: "the United States",
};

const FAMILY_LABEL: Record<string, string> = {
  work: "Work",
  study: "Study",
  job_seeker: "Job seeker",
  family: "Family",
  business: "Business",
};

function useCountryRoutes(country: string) {
  return useQuery({
    queryKey: ["ai", "country-routes", country],
    queryFn: () =>
      unwrap(
        ai.GET("/api/ai/v1/routes/", { params: { query: { country } } }),
      ) as unknown as Promise<RouteSummary[]>,
  });
}

export function CountryView({ code }: { code: string }) {
  const country = code.toUpperCase();
  const routes = useCountryRoutes(country);
  const name = COUNTRY_NAME[country] ?? country;
  const rows = routes.data ?? [];

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <SkipLink />
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <Link href="/ai" className="font-display text-h4">
            Nasuru<span className="text-muted"> AI</span>
          </Link>
          <Link href="/ai/login" className="text-body-s font-semibold text-accent hover:underline">
            Sign in
          </Link>
        </div>
      </header>

      <main id="main" className="mx-auto max-w-4xl px-4 py-12 lg:py-16">
        <p className="text-overline uppercase text-muted">Country guide</p>
        <h1 className="mt-2 font-display text-display-xl text-balance leading-[1.05]">
          Moving to {name}
        </h1>
        <p className="mt-4 max-w-xl text-body-l text-muted">
          The legal routes in, checked against the official rules. See what each takes, then find
          out in two minutes which you qualify for.
        </p>

        <div className="mt-7">
          <ButtonLink href="/ai/tools/eligibility" size="lg">
            Check if I qualify — free
          </ButtonLink>
        </div>

        <section className="mt-10" aria-label="Routes">
          <h2 className="font-display text-h3">Routes to {name}</h2>
          {routes.isError ? (
            <InlineAlert tone="danger" title="We couldn't load the routes." className="mt-3" />
          ) : routes.isPending ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Skeleton className="h-28" />
              <Skeleton className="h-28" />
            </div>
          ) : rows.length === 0 ? (
            <div className="mt-4">
              <EmptyState icon={<ArrowRight aria-hidden />} title="No routes listed yet">
                We haven&rsquo;t published routes for this country yet.
              </EmptyState>
            </div>
          ) : (
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {rows.map((route) => (
                <li key={route.code}>
                  <Link
                    href={`/ai/guides/${route.code}`}
                    className="group block h-full rounded-r-md border border-line bg-surface p-5 hover:border-line-strong"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-display text-h4">{route.name}</p>
                      <ArrowRight
                        aria-hidden
                        className="size-4 text-muted transition-transform group-hover:translate-x-0.5"
                      />
                    </div>
                    <p className="mt-2 text-body-s text-muted tabular-nums">
                      {[
                        FAMILY_LABEL[route.family as string] ?? null,
                        route.leads_to_pr ? "leads to PR" : null,
                        route.typical_months_to_arrival
                          ? `~${route.typical_months_to_arrival} months`
                          : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <p className="mt-8 text-body-s text-muted">
          Rules change. See the{" "}
          <Link href="/ai/changes" className="font-semibold text-accent hover:underline">
            latest updates
          </Link>{" "}
          or how we{" "}
          <Link href="/ai/trust" className="font-semibold text-accent hover:underline">
            keep them current
          </Link>
          .
        </p>
      </main>
    </div>
  );
}
