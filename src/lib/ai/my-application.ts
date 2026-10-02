"use client";

/**
 * My application (plan §8): the agency's own staff-reviewed submission and
 * document checklist for the paid service — moved under the AI shell's own
 * nav. Distinct from Track's self-serve board: a candidate does not add or
 * move these cards themselves, staff review every document. Same backend
 * (`/api/applications/*`, `/api/checklist-items/*`, `/api/schools/`) the old
 * `/dashboard` and `/applications/*` pages already used.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Application, Checklist } from "@/types";
import { ai, unwrap } from "./client";

type Paginated<T> = { count: number; next: string | null; previous: string | null; results: T[] };

export type School = {
  id: string;
  name: string;
  country_name: string | null;
  programmes: { id: string; name: string; intakes: string[] }[];
};

const applicationsKey = ["ai", "my-applications"] as const;
const applicationKey = (id: string) => ["ai", "my-application", id] as const;
const checklistKey = (id: string) => ["ai", "my-application", id, "checklist"] as const;

export function useMyApplications() {
  return useQuery({
    queryKey: applicationsKey,
    queryFn: async () =>
      (await unwrap(ai.GET("/api/applications/"))) as unknown as Paginated<Application>,
  });
}

export function useMyApplication(id: string) {
  return useQuery({
    queryKey: applicationKey(id),
    queryFn: async () =>
      (await unwrap(
        ai.GET("/api/applications/{id}/", { params: { path: { id } } }),
      )) as unknown as Application,
    enabled: Boolean(id),
    retry: false,
  });
}

export function useMyChecklist(applicationId: string) {
  return useQuery({
    queryKey: checklistKey(applicationId),
    queryFn: async () =>
      (await unwrap(
        ai.GET("/api/applications/{id}/checklist/", { params: { path: { id: applicationId } } }),
      )) as unknown as Checklist,
    enabled: Boolean(applicationId),
  });
}

export function useSchools() {
  return useQuery({
    queryKey: ["ai", "schools"] as const,
    queryFn: async () => (await unwrap(ai.GET("/api/schools/"))) as unknown as Paginated<School>,
    staleTime: 10 * 60 * 1000,
  });
}

export function useCreateMyApplication() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: { school: string; programme?: string; intake: string }) =>
      unwrap(ai.POST("/api/applications/", { body })).then(
        (result) => result as unknown as Application,
      ),
    onSuccess: () => void client.invalidateQueries({ queryKey: applicationsKey }),
  });
}

/** Multipart, so no JSON content type — the backend reads `file` and an
 * optional `title`, not documented in the generated schema's request type. */
export function useUploadChecklistDocument(applicationId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, file, title }: { itemId: string; file: File; title?: string }) => {
      const form = new FormData();
      form.append("file", file);
      if (title) form.append("title", title);
      return unwrap(
        ai.POST("/api/checklist-items/{id}/upload/", {
          params: { path: { id: itemId } },
          body: form as never,
          bodySerializer: (body) => body as unknown as BodyInit,
        }),
      );
    },
    onSuccess: () => void client.invalidateQueries({ queryKey: checklistKey(applicationId) }),
  });
}
