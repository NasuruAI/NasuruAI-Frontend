"use client";

/**
 * The document vault (plan §8.4): every file uploaded against a checklist
 * item, across every application, in one place — moved under the AI shell's
 * own nav. Same backend (`/api/documents/`) the old `/documents` page used.
 */

import { useQuery } from "@tanstack/react-query";
import type { StudentDocument } from "@/types";
import { ai, unwrap } from "./client";

type Paginated<T> = { count: number; next: string | null; previous: string | null; results: T[] };

export function useDocuments() {
  return useQuery({
    queryKey: ["ai", "documents"] as const,
    queryFn: async () =>
      (await unwrap(ai.GET("/api/documents/"))) as unknown as Paginated<StudentDocument>,
  });
}
