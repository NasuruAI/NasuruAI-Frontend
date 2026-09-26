"use client";

import { FileText, Mail, Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { ApiError } from "@/lib/api";
import { useDocumentFormats } from "@/lib/ai/cv";
import { type GeneratedDoc, useDocuments, useMakeDocument } from "@/lib/ai/packs";
import { useMe } from "@/lib/ai/shell";
import { Button, ButtonLink } from "../Button";
import { Pill, type Tone } from "../Chip";
import { EmptyState, InlineAlert, Skeleton } from "../feedback";
import { Flag } from "../Flag";

function status(document: GeneratedDoc): { label: string; tone: Tone } {
  if (document.status === "ready") return { label: "Ready", tone: "success" };
  if (document.status === "failed") return { label: "Couldn't be made", tone: "danger" };
  return { label: "Writing…", tone: "info" };
}

function DocumentRow({ document }: { document: GeneratedDoc }) {
  const pill = status(document);
  return (
    <li>
      <Link
        href={`/ai/cv/${document.id}`}
        className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 hover:bg-sunken"
      >
        {document.kind === "cv" ? (
          <FileText aria-hidden className="size-4 shrink-0 text-muted" />
        ) : (
          <Mail aria-hidden className="size-4 shrink-0 text-muted" />
        )}
        <span className="min-w-0 flex-1">
          <span className="block font-semibold text-ink">
            {document.job
              ? `${document.kind_label} for ${document.job_title}`
              : document.format_title}
          </span>
          <span className="block text-body-s text-muted">
            {document.country}
            {document.over_length && " · runs long"}
          </span>
        </span>
        <Pill tone={pill.tone}>{pill.label}</Pill>
      </Link>
    </li>
  );
}

/** /ai/cv (web.md §9): the master CV per country, and every tailored version. */
export function CvStudioView() {
  const me = useMe();
  const documents = useDocuments();
  const formats = useDocumentFormats();
  const make = useMakeDocument();
  const [error, setError] = useState<string | null>(null);
  const [making, setMaking] = useState<string | null>(null);

  const master =
    documents.data?.filter((document) => document.kind === "cv" && !document.job) ?? [];
  const tailored = documents.data?.filter((document) => document.job) ?? [];
  const madeCountries = new Set(master.map((document) => document.country));
  const primary = me.data?.destination;
  const countries = formats.data
    ? [...formats.data].sort((a, b) => (a.country === primary ? -1 : b.country === primary ? 1 : 0))
    : [];

  function makeMaster(country: string) {
    setError(null);
    setMaking(country);
    make.mutate(
      { kind: "cv", country },
      {
        onSettled: () => setMaking(null),
        onError: (err) => setError(err instanceof ApiError ? err.message : "That didn't work."),
      },
    );
  }

  return (
    <>
      <header className="mb-2">
        <p className="text-overline text-muted uppercase">Study</p>
        <h1 className="mt-1 font-display text-h1 text-ink">Your CV and cover letters</h1>
      </header>
      <p className="mb-6 max-w-[65ch] text-body-l text-muted">
        A master CV built from your confirmed facts, in each destination&apos;s own format, and
        every tailored version and cover letter you&apos;ve made for a job.
      </p>

      {error && <InlineAlert tone="danger" title={error} className="mb-4" />}

      <section aria-labelledby="master-heading" className="mb-8">
        <h2 id="master-heading" className="mb-3 text-h3 text-ink">
          Master CV
        </h2>
        {formats.isPending || documents.isPending ? (
          <Skeleton className="h-24 w-full" />
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {countries.map((format) => {
              const existing = master.find((document) => document.country === format.country);
              return (
                <li
                  key={format.country}
                  className="flex items-center justify-between gap-3 rounded-r-md border border-line bg-surface p-4"
                >
                  <span className="flex items-center gap-2">
                    <Flag country={format.country} decorative={false} />
                    <span>
                      <span className="block font-semibold text-ink">{format.country_name}</span>
                      <span className="block text-body-s text-muted">{format.title}</span>
                    </span>
                  </span>
                  {existing ? (
                    <ButtonLink href={`/ai/cv/${existing.id}`} size="sm" variant="secondary">
                      Open
                    </ButtonLink>
                  ) : (
                    <Button
                      size="sm"
                      variant="secondary"
                      loading={making === format.country}
                      onClick={() => makeMaster(format.country)}
                      icon={<Plus aria-hidden className="size-4" />}
                    >
                      Make
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        {madeCountries.size === 0 && !formats.isPending && !documents.isPending && (
          <p className="mt-2 text-body-s text-muted">
            Choose a country above to build your first master CV from your confirmed facts.
          </p>
        )}
      </section>

      <section aria-labelledby="tailored-heading">
        <h2 id="tailored-heading" className="mb-3 text-h3 text-ink">
          Tailored for a job
        </h2>
        {documents.isPending ? (
          <Skeleton className="h-20 w-full" />
        ) : !tailored.length ? (
          <EmptyState icon={<FileText />} title="Nothing tailored yet">
            Choose Make a tailored CV or a cover letter from a job&apos;s answer pack.
          </EmptyState>
        ) : (
          <ul className="divide-y divide-line rounded-r-md border border-line bg-surface">
            {tailored.map((document) => (
              <DocumentRow key={document.id} document={document} />
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
