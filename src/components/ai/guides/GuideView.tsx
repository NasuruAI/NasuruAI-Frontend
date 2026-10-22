"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowRight, ExternalLink } from "lucide-react";
import Link from "next/link";
import { ai, unwrap } from "@/lib/ai/client";
import { ApiError } from "@/lib/api";
import type { components } from "@/lib/ai/schema";
import { ButtonLink } from "../Button";
import { InlineAlert, Skeleton } from "../feedback";

type RouteDetail = components["schemas"]["RouteDetail"];
type Requirement = {
  key: string;
  description: string;
  value?: unknown;
  unit?: string;
  source_name?: string;
  source_url?: string;
  is_stale?: boolean;
};

const COUNTRY_NAME: Record<string, string> = {
  DE: "Germany",
  GB: "United Kingdom",
  CA: "Canada",
  IE: "Ireland",
  NL: "Netherlands",
  CH: "Switzerland",
  US: "United States",
};

function useGuide(code: string) {
  return useQuery({
    queryKey: ["ai", "guide", code],
    queryFn: () =>
      unwrap(
        ai.GET("/api/ai/v1/routes/{route_code}/", { params: { path: { route_code: code } } }),
      ) as unknown as Promise<RouteDetail>,
    retry: false,
  });
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-canvas text-ink">
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <Link href="/ai" className="font-display text-h4">
            Nasuru<span className="text-muted"> AI</span>
          </Link>
          <Link href="/ai/login" className="text-body-s font-semibold text-accent hover:underline">
            Sign in
          </Link>
        </div>
      </header>
      <main id="main" className="mx-auto max-w-3xl px-4 py-12 lg:py-16">
        {children}
      </main>
    </div>
  );
}

export function GuideView({ code }: { code: string }) {
  const guide = useGuide(code);

  if (guide.isPending) {
    return (
      <Shell>
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="mt-4 h-40" />
      </Shell>
    );
  }
  if (guide.isError) {
    const missing = guide.error instanceof ApiError && guide.error.status === 404;
    return (
      <Shell>
        <h1 className="font-display text-h2">
          {missing ? "Route not found" : "We couldn't load this guide"}
        </h1>
        <p className="mt-2 text-body text-muted">
          {missing ? "This route may have been renamed or retired." : "Try again in a moment."}
        </p>
        <Link
          href="/ai/tools/eligibility"
          className="mt-4 inline-block font-semibold text-accent hover:underline"
        >
          Check which routes you qualify for
        </Link>
      </Shell>
    );
  }

  const route = guide.data;
  const requirements = (route.requirements ?? []) as Requirement[];

  return (
    <Shell>
      <p className="text-overline uppercase text-muted">
        {COUNTRY_NAME[route.country] ?? route.country} · route guide
      </p>
      <h1 className="mt-2 font-display text-display-xl text-balance leading-[1.05]">
        {route.name}
      </h1>
      {route.summary && <p className="mt-4 text-body-l text-muted">{route.summary}</p>}
      <p className="mt-3 text-body-s text-subtle">
        {[
          route.leads_to_pr ? "Can lead to permanent residence" : null,
          route.typical_months_to_arrival
            ? `about ${route.typical_months_to_arrival} months`
            : null,
        ]
          .filter(Boolean)
          .join(" · ")}
      </p>

      <section className="mt-10" aria-label="Requirements">
        <h2 className="font-display text-h3">What it takes</h2>
        {requirements.length === 0 ? (
          <InlineAlert
            tone="info"
            title="Requirements for this route aren't published yet."
            className="mt-3"
          />
        ) : (
          <ul className="mt-4 space-y-3">
            {requirements.map((req) => (
              <li key={req.key} className="rounded-r-md border border-line bg-surface p-4">
                <p className="text-body text-ink">{req.description}</p>
                {req.source_url && (
                  <a
                    href={req.source_url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1.5 inline-flex items-center gap-1 text-caption font-semibold text-accent hover:underline"
                  >
                    {req.source_name || "Official source"}
                    <ExternalLink aria-hidden className="size-3" />
                    {req.is_stale && <span className="ml-1 text-warning">· awaiting re-check</span>}
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {route.leads_to.length > 0 && (
        <section className="mt-8" aria-label="Leads to">
          <h2 className="font-display text-h3">Where it can lead</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {route.leads_to.map((next) => (
              <Link
                key={next.code}
                href={`/ai/guides/${next.code}`}
                className="group inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-4 py-2 text-body-s font-semibold hover:border-line-strong"
              >
                {next.name}
                <ArrowRight
                  aria-hidden
                  className="size-4 text-muted transition-transform group-hover:translate-x-0.5"
                />
              </Link>
            ))}
          </div>
        </section>
      )}

      <div className="mt-10">
        <ButtonLink href="/ai/tools/eligibility" size="lg">
          Check if I qualify — free
        </ButtonLink>
      </div>
    </Shell>
  );
}
