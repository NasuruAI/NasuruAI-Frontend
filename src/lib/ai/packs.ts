"use client";

/**
 * Answer packs (web.md §8, web-build F9): every field of a job's application
 * form, answered from the confirmed profile, with where each answer came from.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ai, ApiError, unwrap } from "./client";
import type { components } from "./schema";

type Schemas = components["schemas"];
export type PackAnswer = Schemas["Answer"];
export type AnswerKind = Schemas["AnswerKindEnum"];
export type CitedFact = Schemas["CitedFact"];
export type PackSummary = Schemas["AnswerPackSummary"];
export type PackStatus = Schemas["AnswerPackStatusEnum"];
export type GeneratedDoc = Schemas["GeneratedDocument"];
export type Card = Schemas["Card"];

export type PackForm = { ats: string; apply_url: string; note: string };
export type PackSection = { section: string; answers: PackAnswer[] };

/** The pack as the page uses it: the API types `form`, `counts` and `sections` loosely. */
export type Pack = Omit<Schemas["AnswerPack"], "form" | "counts" | "sections"> & {
  form: PackForm | null;
  counts: Record<AnswerKind, number>;
  sections: PackSection[];
};

export const packKeys = {
  list: ["ai", "packs"] as const,
  detail: (id: string) => ["ai", "pack", id] as const,
  documents: ["ai", "generated-documents"] as const,
  document: (id: string) => ["ai", "generated-document", id] as const,
  board: ["ai", "board"] as const,
};

const BUILDING: PackStatus[] = ["queued", "reading_form", "answering"];

export function isBuilding(status: PackStatus | undefined): boolean {
  return BUILDING.includes(status ?? "queued");
}

export function allAnswers(pack: Pick<Pack, "sections">): PackAnswer[] {
  return pack.sections.flatMap((section) => section.answers);
}

export function usePacks() {
  return useQuery({
    queryKey: packKeys.list,
    queryFn: () => unwrap(ai.GET("/api/ai/v1/me/answer-packs/")),
    refetchInterval: (query) =>
      query.state.data?.some((pack) => isBuilding(pack.status)) ? 3000 : false,
  });
}

/** One pack, polled while it's being built or an answer is being written again. */
export function usePack(id: string) {
  return useQuery({
    queryKey: packKeys.detail(id),
    queryFn: async () =>
      (await unwrap(
        ai.GET("/api/ai/v1/me/answer-packs/{pack_id}/", { params: { path: { pack_id: id } } }),
      )) as unknown as Pack,
    retry: false,
    refetchInterval: (query) => {
      const pack = query.state.data;
      if (!pack) return false;
      return isBuilding(pack.status) || allAnswers(pack).some((answer) => answer.regenerating)
        ? 1500
        : false;
    },
  });
}

function replaceAnswer(pack: Pack | undefined, answer: PackAnswer): Pack | undefined {
  if (!pack) return pack;
  return {
    ...pack,
    sections: pack.sections.map((section) => ({
      ...section,
      answers: section.answers.map((other) => (other.id === answer.id ? answer : other)),
    })),
  };
}

export function useEditAnswer(packId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, value }: { id: string; value: string }) =>
      unwrap(
        ai.PATCH("/api/ai/v1/me/answer-packs/{pack_id}/answers/{answer_id}/", {
          params: { path: { pack_id: packId, answer_id: id } },
          body: { value },
        }),
      ),
    onSuccess: (answer) =>
      client.setQueryData<Pack>(packKeys.detail(packId), (pack) => replaceAnswer(pack, answer)),
  });
}

/** Write a written answer again; the page polls until it's back. */
export function useRegenerate(packId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      unwrap(
        ai.POST("/api/ai/v1/me/answer-packs/{pack_id}/answers/{answer_id}/regenerate/", {
          params: { path: { pack_id: packId, answer_id: id } },
        }),
      ),
    onSuccess: (answer) =>
      client.setQueryData<Pack>(packKeys.detail(packId), (pack) => replaceAnswer(pack, answer)),
  });
}

/** A pack from a pasted link. Errors carry `code`: needs_extension, not_listed, unknown_site, failed_checks. */
export function usePackFromUrl() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (url: string) =>
      unwrap(
        ai.POST("/api/ai/v1/me/answer-packs/from-url/", {
          body: { url },
          headers: { "Idempotency-Key": crypto.randomUUID() },
        }),
      ),
    onSuccess: () => void client.invalidateQueries({ queryKey: packKeys.list }),
  });
}

/** After a failure: ask for the job's pack again (a failed pack never blocks a new one). */
export function useRetryPack() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (jobId: string) =>
      unwrap(
        ai.POST("/api/ai/v1/jobs/{job_id}/answer-pack/", {
          params: { path: { job_id: jobId } },
          headers: { "Idempotency-Key": crypto.randomUUID() },
        }),
      ),
    onSuccess: () => void client.invalidateQueries({ queryKey: packKeys.list }),
  });
}

// --- Files: tailored CVs and cover letters for the job -------------------------------

export function useJobDocuments(jobId: string | undefined) {
  return useQuery({
    queryKey: packKeys.documents,
    queryFn: () => unwrap(ai.GET("/api/ai/v1/me/generated-documents/")),
    enabled: Boolean(jobId),
    select: (documents) => documents.filter((document) => document.job === jobId),
    refetchInterval: (query) =>
      query.state.data?.some((document) => document.status === "queued") ? 2000 : false,
  });
}

/** Every CV and cover letter: the master CV studio's list (web.md §9). */
export function useDocuments() {
  return useQuery({
    queryKey: packKeys.documents,
    queryFn: () => unwrap(ai.GET("/api/ai/v1/me/generated-documents/")),
    refetchInterval: (query) =>
      query.state.data?.some((document) => document.status === "queued") ? 2000 : false,
  });
}

/** One document, polled while it's queued or a bullet is being tightened. */
export function useDocument(id: string) {
  return useQuery({
    queryKey: packKeys.document(id),
    queryFn: () =>
      unwrap(
        ai.GET("/api/ai/v1/me/generated-documents/{document_id}/", {
          params: { path: { document_id: id } },
        }),
      ),
    retry: false,
    refetchInterval: (query) => {
      const document = query.state.data;
      if (!document) return false;
      if (document.status === "queued") return 2000;
      const content = document.content as Schemas["CvContent"] | null;
      const tightening = content?.experience?.some((role) =>
        role.bullets.some((bullet) => bullet.tightening),
      );
      return tightening ? 1500 : false;
    },
  });
}

/**
 * A CV or cover letter: tailored to `job`, or (CVs only) a master copy for
 * `country` when there's no job. Asking again returns the same document.
 */
export function useMakeDocument() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      kind,
      job,
      country = "",
      includePersonalDetails = false,
    }: {
      kind: "cv" | "cover_letter";
      job?: string;
      country?: string;
      includePersonalDetails?: boolean;
    }) =>
      unwrap(
        ai.POST("/api/ai/v1/me/generated-documents/", {
          body: {
            kind,
            job: job ?? null,
            country,
            include_personal_details: includePersonalDetails,
          },
          headers: { "Idempotency-Key": crypto.randomUUID() },
        }),
      ),
    onSuccess: () => void client.invalidateQueries({ queryKey: packKeys.documents }),
  });
}

/** The file name from Content-Disposition, else a fallback. */
export function fileName(disposition: string | null, fallback: string): string {
  const match = disposition?.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i);
  return match ? decodeURIComponent(match[1]) : fallback;
}

/**
 * Downloads need the session token, so they're fetched and saved, not linked.
 * The query key is `as`, not `format`: openapi-fetch (and the browser) would
 * otherwise read `?format=pdf` as a request for a renderer named "pdf".
 */
export async function downloadDocument(document: GeneratedDoc, format: "pdf" | "docx") {
  const { data, response } = await ai.GET(
    "/api/ai/v1/me/generated-documents/{document_id}/download/",
    { params: { path: { document_id: document.id }, query: { as: format } }, parseAs: "blob" },
  );
  if (!response.ok || !data)
    throw new ApiError("That download didn't work. Try again.", response.status);
  const url = URL.createObjectURL(data as Blob);
  const link = window.document.createElement("a");
  link.href = url;
  link.download = fileName(
    response.headers.get("Content-Disposition"),
    `${document.kind_label}.${format}`,
  );
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// --- Mark as applied: the board card for the job (M5-4) ------------------------------

type Board = { columns: { state: string; label: string; cards: Card[] }[] };

export function useJobCard(jobId: string | undefined) {
  return useQuery({
    queryKey: packKeys.board,
    queryFn: async () => (await unwrap(ai.GET("/api/ai/v1/me/applications/"))) as unknown as Board,
    enabled: Boolean(jobId),
    select: (board) =>
      board.columns.flatMap((column) => column.cards).find((card) => card.job === jobId) ?? null,
  });
}

async function cardFor(jobId: string): Promise<Card> {
  return unwrap(
    ai.POST("/api/ai/v1/me/applications/", {
      body: { job: jobId },
      headers: { "Idempotency-Key": crypto.randomUUID() },
    }),
  );
}

/**
 * The job's card, moved to "applied" (which schedules the 10-day follow-up).
 * The card is made if there isn't one; a move that loses a race (409) is tried
 * once more against the card as it is now.
 */
export function useMarkApplied() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (jobId: string) => {
      for (let attempt = 0; attempt < 2; attempt++) {
        const card = await cardFor(jobId);
        if (card.state === "applied") return card;
        try {
          return await unwrap(
            ai.POST("/api/ai/v1/me/applications/{card_id}/move/", {
              params: { path: { card_id: card.id } },
              body: { to: "applied", version: card.version ?? 1, note: "", visa_outcome: "" },
            }),
          );
        } catch (error) {
          if (!(error instanceof ApiError && error.status === 409) || attempt === 1) throw error;
        }
      }
      throw new ApiError("That didn't save. Try again.", 409);
    },
    onSuccess: () => void client.invalidateQueries({ queryKey: packKeys.board }),
  });
}

// --- Copy all -------------------------------------------------------------------------

/** One line for the plain-text export. */
export function answerLine(answer: PackAnswer): string {
  const value = (answer.value ?? "").trim();
  switch (answer.kind) {
    case "upload":
      return "(upload a file)";
    case "you_answer":
      return value || "(you answer this one yourself)";
    case "missing":
      return value || "(not in your profile)";
    default:
      return value;
  }
}

/** "Copy all as text": a numbered list in the form's order, to fill on another device. */
export function packAsText(pack: Pick<Pack, "job_title" | "employer" | "sections">): string {
  const lines = [`Answers for ${pack.employer} · ${pack.job_title}`, ""];
  let number = 0;
  for (const section of pack.sections) {
    lines.push(section.section.toUpperCase());
    for (const answer of section.answers) {
      number += 1;
      lines.push(
        `${number}. ${answer.field.label}`,
        `   ${answerLine(answer).replace(/\n/g, "\n   ")}`,
      );
    }
    lines.push("");
  }
  return lines.join("\n").trimEnd() + "\n";
}
