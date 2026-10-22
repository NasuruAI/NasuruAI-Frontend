"use client";

import { useQuery } from "@tanstack/react-query";
import { ShieldAlert } from "lucide-react";
import Link from "next/link";
import { ai, unwrap } from "@/lib/ai/client";
import type { components } from "@/lib/ai/schema";
import { ButtonLink } from "../Button";
import { formatDate } from "../evidence/format";
import { EmptyState, InlineAlert, Skeleton } from "../feedback";

type PublicScam = components["schemas"]["PublicScam"];

function useScams() {
  return useQuery({
    queryKey: ["ai", "scams"],
    queryFn: () => unwrap(ai.GET("/api/ai/v1/scams/")) as unknown as Promise<PublicScam[]>,
  });
}

export function ScamsView() {
  const scams = useScams();
  const rows = scams.data ?? [];

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
        <p className="text-overline uppercase text-muted">Scam watch</p>
        <h1 className="mt-2 font-display text-display-xl text-balance leading-[1.05]">
          Known job and visa scams.
        </h1>
        <p className="mt-4 max-w-xl text-body-l text-muted">
          Confirmed scams reported by people like you and verified by our team. Got an offer that
          feels off? Check it before you pay anyone a kobo.
        </p>

        <div className="mt-6 rounded-r-md border border-accent-soft bg-accent-soft/40 p-5">
          <p className="font-semibold">Got an offer on WhatsApp or email?</p>
          <p className="mt-1 text-body-s text-muted">
            Sign up and paste it into the offer checker — we&rsquo;ll tell you if it looks genuine
            before you pay anyone.
          </p>
          <ButtonLink href="/ai/signup" size="sm" className="mt-3">
            Check an offer
          </ButtonLink>
        </div>

        <section className="mt-10" aria-label="Confirmed scams">
          <h2 className="font-display text-h3">Confirmed scams</h2>
          {scams.isError ? (
            <InlineAlert tone="danger" title="We couldn't load the scam list." className="mt-4" />
          ) : scams.isPending ? (
            <div className="mt-4 space-y-3">
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
            </div>
          ) : rows.length === 0 ? (
            <div className="mt-4">
              <EmptyState icon={<ShieldAlert aria-hidden />} title="No confirmed scams listed yet">
                When our team confirms a reported scam, it appears here.
              </EmptyState>
            </div>
          ) : (
            <ul className="mt-4 space-y-3">
              {rows.map((scam, index) => (
                <li
                  key={`${scam.sender_domain}-${index}`}
                  className="rounded-r-md border border-danger-line bg-danger-bg p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="font-semibold text-ink">
                      {scam.company_name || scam.sender_domain}
                    </p>
                    <span className="text-caption text-muted tabular-nums">
                      confirmed {formatDate(scam.confirmed_at)}
                    </span>
                  </div>
                  {scam.sender_domain && (
                    <p className="mt-0.5 text-body-s text-danger tabular-nums">
                      {scam.sender_domain}
                    </p>
                  )}
                  <p className="mt-2 text-body-s text-ink">{scam.summary}</p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <p className="mt-8 text-body-s text-muted">
          Remember: a real employer never asks you to pay for a job, a visa, or an &ldquo;agent
          fee&rdquo;.
        </p>
      </main>
    </div>
  );
}
