"use client";

/**
 * The CV studio (web.md §9, web-build F10): the master CV and tailored
 * versions, edited in place — sections reordered, bullets included, excluded,
 * reordered or tightened, the summary or a cover letter's body rewritten.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ai, unwrap } from "./client";
import { type GeneratedDoc, packKeys } from "./packs";
import type { components } from "./schema";

type Schemas = components["schemas"];
export type CvBullet = Schemas["CvBullet"];
export type CvRole = Schemas["CvRole"];
export type CvEducation = Schemas["CvEducation"];
export type CvContent = Schemas["CvContent"];
export type CoverLetterContent = Schemas["CoverLetterContent"];
export type DocumentFormat = Schemas["DocumentFormat"];
export type SectionKey = Schemas["SectionOrderEnum"];

export const SECTION_KEYS: SectionKey[] = [
  "summary",
  "experience",
  "education",
  "skills",
  "certifications",
  "languages",
];

export const SECTION_LABELS: Record<SectionKey, string> = {
  summary: "Profile",
  experience: "Experience",
  education: "Education",
  skills: "Skills",
  certifications: "Certifications",
  languages: "Languages",
};

/** The CV content, when this document is a CV (its content is typed loosely on the API). */
export function cvContent(document: Pick<GeneratedDoc, "kind" | "content">): CvContent | null {
  return document.kind === "cv" ? ((document.content ?? null) as CvContent | null) : null;
}

/** The cover letter's content, when this document is one. */
export function letterContent(
  document: Pick<GeneratedDoc, "kind" | "content">,
): CoverLetterContent | null {
  return document.kind === "cover_letter"
    ? ((document.content ?? null) as CoverLetterContent | null)
    : null;
}

function setDocument(client: ReturnType<typeof useQueryClient>, document: GeneratedDoc) {
  client.setQueryData(packKeys.document(document.id), document);
  client.setQueriesData<GeneratedDoc[]>({ queryKey: packKeys.documents }, (list) =>
    list?.map((other) => (other.id === document.id ? document : other)),
  );
}

export function useDocumentFormats() {
  return useQuery({
    queryKey: ["ai", "generated-document-formats"] as const,
    queryFn: () => unwrap(ai.GET("/api/ai/v1/me/generated-documents/formats/")),
    staleTime: 60 * 60 * 1000,
  });
}

export function useReorderSections() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, order }: { id: string; order: SectionKey[] }) =>
      unwrap(
        ai.PATCH("/api/ai/v1/me/generated-documents/{document_id}/sections/", {
          params: { path: { document_id: id } },
          body: { order },
        }),
      ),
    onSuccess: (document) => setDocument(client, document),
  });
}

export function useReorderBullets() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, roleIndex, order }: { id: string; roleIndex: number; order: string[] }) =>
      unwrap(
        ai.PATCH("/api/ai/v1/me/generated-documents/{document_id}/roles/{role_index}/bullets/", {
          params: { path: { document_id: id, role_index: roleIndex } },
          body: { order },
        }),
      ),
    onSuccess: (document) => setDocument(client, document),
  });
}

export function useToggleBullet() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, bulletId }: { id: string; bulletId: string }) =>
      unwrap(
        ai.POST("/api/ai/v1/me/generated-documents/{document_id}/bullets/{bullet_id}/toggle/", {
          params: { path: { document_id: id, bullet_id: bulletId } },
        }),
      ),
    onSuccess: (document) => setDocument(client, document),
  });
}

/** AI "tighten this bullet" (web.md §9): a rewrite, capped and diff-able. */
export function useTightenBullet() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, bulletId }: { id: string; bulletId: string }) =>
      unwrap(
        ai.POST("/api/ai/v1/me/generated-documents/{document_id}/bullets/{bullet_id}/tighten/", {
          params: { path: { document_id: id, bullet_id: bulletId } },
        }),
      ),
    onSuccess: (document) => setDocument(client, document),
  });
}

export function useRestoreBullet() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, bulletId }: { id: string; bulletId: string }) =>
      unwrap(
        ai.POST("/api/ai/v1/me/generated-documents/{document_id}/bullets/{bullet_id}/restore/", {
          params: { path: { document_id: id, bullet_id: bulletId } },
        }),
      ),
    onSuccess: (document) => setDocument(client, document),
  });
}

/** The CV's profile summary, or a cover letter's body (paragraphs on a blank line). */
export function useEditDocumentText() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, value }: { id: string; value: string }) =>
      unwrap(
        ai.PATCH("/api/ai/v1/me/generated-documents/{document_id}/text/", {
          params: { path: { document_id: id } },
          body: { value },
        }),
      ),
    onSuccess: (document) => setDocument(client, document),
  });
}

export function useDeleteDocument() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      unwrap(
        ai.DELETE("/api/ai/v1/me/generated-documents/{document_id}/", {
          params: { path: { document_id: id } },
        }),
      ),
    onSuccess: (_result, id) =>
      client.setQueriesData<GeneratedDoc[]>({ queryKey: packKeys.documents }, (list) =>
        list?.filter((document) => document.id !== id),
      ),
  });
}
