"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { ai, unwrap } from "@/lib/ai/client";
import {
  type CandidateDocument,
  type DocumentKind,
  isReading,
  onboardingKeys,
  stepHref,
  useDocuments,
} from "@/lib/ai/onboarding";
import { shellKeys } from "@/lib/ai/shell";
import { MAX_UPLOAD_BYTES } from "@/lib/ai/upload";
import { ButtonLink } from "../Button";
import { InlineAlert, Skeleton } from "../feedback";
import { Select } from "../Select";
import { type UploadItem, Uploader } from "../Uploader";
import { StepActions, StepIntro } from "./OnboardingFrame";
import { useUploads } from "./useUploads";

const ACCEPT = ".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg";
const TYPES_HINT = "PDF, or a photo (JPG or PNG), up to 15 MB.";

const OPTIONAL_KINDS: { value: DocumentKind; label: string }[] = [
  { value: "degree_certificate", label: "Degree certificate" },
  { value: "transcript", label: "Transcript" },
  { value: "language_test", label: "Language test result (IELTS, TOEFL…)" },
  { value: "passport_bio", label: "Passport bio page" },
  { value: "other", label: "Something else" },
];

/** A stored document as an Uploader row, with what's happening to it. */
function asRow(document: CandidateDocument): UploadItem {
  const note = isReading(document)
    ? "We'll read this in the background."
    : document.status === "extracted"
      ? `Read: ${document.facts_extracted ?? 0} detail${document.facts_extracted === 1 ? "" : "s"} found for you to check.`
      : document.status === "failed"
        ? "We couldn't read this one. You can add the details yourself in a later step."
        : "Stored safely. We don't read this kind of document.";
  return {
    id: `doc:${document.id}`,
    name: document.original_filename,
    size: document.size_bytes,
    type: document.content_type,
    status: isReading(document) ? "processing" : "done",
    note,
  };
}

export function UploadStep() {
  const client = useQueryClient();
  const documents = useDocuments();
  const uploads = useUploads();
  const [kind, setKind] = useState<DocumentKind>("degree_certificate");

  const remove = useMutation({
    mutationFn: (id: string) =>
      unwrap(
        ai.DELETE("/api/ai/v1/me/documents/{document_id}/", {
          params: { path: { document_id: id } },
        }),
      ),
    onSettled: () => {
      void client.invalidateQueries({ queryKey: onboardingKeys.documents });
      void client.invalidateQueries({ queryKey: shellKeys.me });
    },
  });

  const onRemove = (id: string) =>
    id.startsWith("doc:") ? remove.mutate(id.slice(4)) : uploads.remove(id);

  const stored = documents.data ?? [];
  const cvRows = [
    ...stored.filter((document) => document.kind === "cv").map(asRow),
    ...uploads.items.filter((item) => item.kind === "cv"),
  ];
  const otherRows = [
    ...stored.filter((document) => document.kind !== "cv").map(asRow),
    ...uploads.items.filter((item) => item.kind !== "cv"),
  ];
  const hasCv = stored.some((document) => document.kind === "cv");
  const cvUploading = uploads.items.some((item) => item.kind === "cv" && item.status !== "failed");

  return (
    <>
      <StepIntro
        title="Add your CV"
        lead="We read it to fill in your work history, education and skills, so you don't have to type them. You'll check every detail before we use it."
      />
      {documents.isPending ? (
        <Skeleton className="h-40 w-full" />
      ) : (
        <div className="space-y-8">
          {documents.isError && (
            <InlineAlert
              tone="danger"
              title="We couldn't load your documents. Reload the page to try again."
            />
          )}
          <section aria-labelledby="cv-heading" className="space-y-3">
            <h2 id="cv-heading" className="text-h3 text-ink">
              Your CV
            </h2>
            <Uploader
              label="Upload your CV"
              hint={`${TYPES_HINT} Got a Word file? Save it as PDF first.`}
              accept={ACCEPT}
              multiple={false}
              maxBytes={MAX_UPLOAD_BYTES}
              items={cvRows}
              onFiles={(files) => uploads.add(files.slice(0, 1), "cv")}
              onRetry={uploads.retry}
              onRemove={onRemove}
              disabled={hasCv || cvUploading}
            />
          </section>
          <section aria-labelledby="more-heading" className="space-y-3">
            <div>
              <h2 id="more-heading" className="text-h3 text-ink">
                Anything else? <span className="text-body font-normal text-muted">(optional)</span>
              </h2>
              <p className="mt-1 text-body text-muted">
                Certificates, transcripts and test results make your results more exact. You can add
                them later too.
              </p>
            </div>
            <Select
              label="What are you adding?"
              options={OPTIONAL_KINDS}
              value={kind}
              onChange={(event) => setKind(event.target.value as DocumentKind)}
              className="max-w-sm"
            />
            <Uploader
              label="Upload documents"
              hint={TYPES_HINT}
              accept={ACCEPT}
              maxBytes={MAX_UPLOAD_BYTES}
              items={otherRows}
              onFiles={(files) => uploads.add(files, kind)}
              onRetry={uploads.retry}
              onRemove={onRemove}
            />
          </section>
        </div>
      )}
      <StepActions back={stepHref("welcome")}>
        {!hasCv && (
          <Link
            href={stepHref("questions")}
            className="rounded-r-sm px-2 py-2 text-body font-semibold text-accent hover:bg-accent-soft"
          >
            I don&apos;t have a CV
          </Link>
        )}
        {hasCv ? (
          <ButtonLink href={stepHref("questions")} variant="primary" size="lg">
            Continue
          </ButtonLink>
        ) : (
          <span className="text-body-s text-muted">
            {cvUploading ? "Uploading your CV…" : "Add your CV to continue."}
          </span>
        )}
      </StepActions>
    </>
  );
}
