"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { SkipLink } from "../SkipLink";
import { ai, unwrap } from "@/lib/ai/client";
import type { components } from "@/lib/ai/schema";
import { InlineAlert, Skeleton } from "../feedback";

type FreshnessRow = components["schemas"]["FreshnessRow"];

const COUNTRY_NAME: Record<string, string> = {
  DE: "Germany",
  GB: "United Kingdom",
  CA: "Canada",
  IE: "Ireland",
  NL: "Netherlands",
  CH: "Switzerland",
  US: "United States",
};

function useFreshness() {
  return useQuery({
    queryKey: ["ai", "trust", "freshness"],
    queryFn: () =>
      unwrap(ai.GET("/api/ai/v1/trust/freshness/")) as unknown as Promise<FreshnessRow[]>,
  });
}

export function TrustView() {
  const freshness = useFreshness();
  const rows = (freshness.data ?? []).filter((r) => r.facts > 0 || r.sources > 0);

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
        <p className="text-overline uppercase text-muted">Trust</p>
        <h1 className="mt-2 font-display text-display-xl text-balance leading-[1.05]">
          Every figure comes from an official source.
        </h1>
        <p className="mt-4 max-w-xl text-body-l text-muted">
          We track each country&rsquo;s rules against the government pages they come from, and we
          show you when each was last checked. Here&rsquo;s where things stand right now.
        </p>

        <section className="mt-10" aria-label="Freshness by country">
          {freshness.isError ? (
            <InlineAlert tone="danger" title="We couldn't load the freshness report." />
          ) : freshness.isPending ? (
            <div className="space-y-3">
              <Skeleton className="h-14" />
              <Skeleton className="h-14" />
              <Skeleton className="h-14" />
            </div>
          ) : rows.length === 0 ? (
            <InlineAlert tone="info" title="No sources tracked yet." />
          ) : (
            <ul className="divide-y divide-line rounded-r-md border border-line bg-surface">
              {rows.map((row) => (
                <li
                  key={row.country}
                  className="flex flex-wrap items-center justify-between gap-3 p-4"
                >
                  <span className="font-semibold">{COUNTRY_NAME[row.country] ?? row.country}</span>
                  <span className="flex flex-wrap gap-x-5 gap-y-1 text-body-s text-muted tabular-nums">
                    <span>
                      <span className="text-ink">{row.facts}</span> rules tracked
                    </span>
                    <span>
                      <span className="text-ink">{row.sources}</span> official sources
                    </span>
                    <span>
                      {row.fresh_percent == null ? "—" : `${Math.round(row.fresh_percent)}%`}{" "}
                      checked recently
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mt-10 grid gap-4 sm:grid-cols-3">
          {[
            [
              "Sourced",
              "Every rule links to the official page it came from. No guesses, no hearsay.",
            ],
            ["Dated", "We record when each page was last checked, and flag anything going stale."],
            ["Reviewed", "A failed or changed source opens a review before it reaches you."],
          ].map(([title, line]) => (
            <div key={title} className="rounded-r-md border border-line bg-surface p-5">
              <p className="font-display text-h4">{title}</p>
              <p className="mt-1 text-body-s text-muted">{line}</p>
            </div>
          ))}
        </section>

        <p className="mt-8 text-body-s text-muted">
          See the method behind our checks on the{" "}
          <Link href="/ai/how-ranking-works" className="font-semibold text-accent hover:underline">
            ranking page
          </Link>
          .
        </p>
      </main>
    </div>
  );
}
