"use client";

import { useQuery } from "@tanstack/react-query";
import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { ai, unwrap } from "@/lib/ai/client";
import type { components } from "@/lib/ai/schema";
import { formatDate } from "../evidence/format";
import { EmptyState, InlineAlert, Skeleton } from "../feedback";

type Change = components["schemas"]["PublicChange"];

const COUNTRY_NAME: Record<string, string> = {
  DE: "Germany",
  GB: "United Kingdom",
  CA: "Canada",
  IE: "Ireland",
  NL: "Netherlands",
  CH: "Switzerland",
  US: "United States",
};

function useChanges() {
  return useQuery({
    queryKey: ["ai", "changes"],
    queryFn: () => unwrap(ai.GET("/api/ai/v1/changes/")) as unknown as Promise<Change[]>,
  });
}

export function ChangesView() {
  const changes = useChanges();
  const rows = changes.data ?? [];

  return (
    <div className="min-h-screen bg-canvas text-ink">
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
        <p className="text-overline uppercase text-muted">Changelog</p>
        <h1 className="mt-2 font-display text-display-xl text-balance leading-[1.05]">
          What changed, and when.
        </h1>
        <p className="mt-4 max-w-xl text-body-l text-muted">
          Every immigration-rule change we&rsquo;ve published, newest first — each linked to the
          official source it came from.
        </p>

        <section className="mt-10" aria-label="Rule changes">
          {changes.isError ? (
            <InlineAlert tone="danger" title="We couldn't load the changelog." />
          ) : changes.isPending ? (
            <div className="space-y-3">
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
            </div>
          ) : rows.length === 0 ? (
            <EmptyState icon={<ExternalLink aria-hidden />} title="No changes published yet">
              When a rule changes, it appears here with its source.
            </EmptyState>
          ) : (
            <ul className="space-y-3">
              {rows.map((change, index) => (
                <li
                  key={`${change.route?.code}-${change.key}-${index}`}
                  className="rounded-r-md border border-line bg-surface p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <span className="text-caption font-semibold uppercase text-muted">
                      {COUNTRY_NAME[change.route?.country ?? ""] ?? change.route?.country} ·{" "}
                      {change.route?.name}
                    </span>
                    <span className="text-caption text-subtle tabular-nums">
                      effective {formatDate(change.effective_from)}
                    </span>
                  </div>
                  <p className="mt-2 text-body text-ink">{change.description}</p>
                  {change.source_url && (
                    <a
                      href={change.source_url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-flex items-center gap-1 text-body-s font-semibold text-accent hover:underline"
                    >
                      {change.source_name || "Official source"}
                      <ExternalLink aria-hidden className="size-3.5" />
                    </a>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
