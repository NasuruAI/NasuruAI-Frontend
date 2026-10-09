"use client";

/**
 * Fees, credentials and arrival (web.md §11.5, web-build F12). The route
 * checklist and grounded Q&A used by the same "visa guide" page already
 * live in routes.ts (useChecklist, useAsk, useAnswer) — F7 built them first.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ai, unwrap } from "./client";
import type { components } from "./schema";

type Schemas = components["schemas"];
export type CredentialGuide = Schemas["GuideCredentialGuide"];
export type CredentialRequest = Schemas["GuideCredentialRequest"];
export type CredentialStatus = Schemas["CredentialRequestStatusEnum"];
export type ArrivalCategory = Schemas["GuideArrivalItemCategoryEnum"];

export type Fee = {
  id: string;
  portal: string;
  label: string;
  amount: string;
  currency: string;
  naira: { converted: string; rate: string; as_of: string | null } | null;
  card_notes: string;
  alternatives: string;
  url: string;
  source_url: string;
  verified_at: string;
  stale: boolean;
};

export type ArrivalItem = {
  id: string;
  category: ArrivalCategory;
  title: string;
  detail: string;
  city: string;
  due_within_days: number | null;
  due_by: string | null;
  scam_warning: boolean;
  done_at: string | null;
  source_url: string;
  stale: boolean;
};

export const guidanceKeys = {
  fees: (country: string) => ["ai", "guidance", "fees", country] as const,
  credentialGuides: (q: string) => ["ai", "guidance", "credential-guides", q] as const,
  credentialRequests: ["ai", "guidance", "credential-requests"] as const,
  letter: (guideId: string, recipient: string) =>
    ["ai", "guidance", "letter", guideId, recipient] as const,
  arrival: (country: string, city: string, arrivedOn: string) =>
    ["ai", "guidance", "arrival", country, city, arrivedOn] as const,
};

export function useFees(country: string) {
  return useQuery({
    queryKey: guidanceKeys.fees(country),
    queryFn: async () =>
      (await unwrap(
        ai.GET("/api/ai/v1/guide/fees/", { params: { query: { country } } }),
      )) as unknown as {
        country: string;
        fees: Fee[];
      },
    enabled: Boolean(country),
  });
}

export function useCredentialGuides(q: string) {
  return useQuery({
    queryKey: guidanceKeys.credentialGuides(q),
    queryFn: () => unwrap(ai.GET("/api/ai/v1/guide/credentials/", { params: { query: { q } } })),
    enabled: q.trim().length > 1,
  });
}

export function useCredentialLetter(guideId: string | null, recipient: string) {
  return useQuery({
    queryKey: guidanceKeys.letter(guideId ?? "", recipient),
    queryFn: async () =>
      (
        (await unwrap(
          ai.GET("/api/ai/v1/guide/credentials/{guide_id}/letter/", {
            params: { path: { guide_id: guideId! }, query: { recipient } },
          }),
        )) as unknown as { letter: string }
      ).letter,
    enabled: Boolean(guideId),
  });
}

export function useCredentialRequests() {
  return useQuery({
    queryKey: guidanceKeys.credentialRequests,
    queryFn: () => unwrap(ai.GET("/api/ai/v1/me/credential-requests/")),
  });
}

export function useAddCredentialRequest() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: { guide?: string; institution: string; recipient: string }) =>
      unwrap(
        ai.POST("/api/ai/v1/me/credential-requests/", {
          body: {
            institution: input.institution,
            recipient: input.recipient,
            guide: input.guide ?? null,
          },
        }),
      ),
    onSuccess: () => void client.invalidateQueries({ queryKey: guidanceKeys.credentialRequests }),
  });
}

export function useUpdateCredentialRequest() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      version,
      ...changes
    }: {
      id: string;
      version: number;
      status?: CredentialStatus;
      requested_on?: string | null;
      notes?: string;
    }) =>
      unwrap(
        ai.PATCH("/api/ai/v1/me/credential-requests/{request_id}/", {
          params: { path: { request_id: id } },
          body: { version, ...changes },
        }),
      ),
    onSuccess: () => void client.invalidateQueries({ queryKey: guidanceKeys.credentialRequests }),
  });
}

export function useArrival(country: string, city: string, arrivedOn: string) {
  return useQuery({
    queryKey: guidanceKeys.arrival(country, city, arrivedOn),
    queryFn: async () =>
      (
        (await unwrap(
          ai.GET("/api/ai/v1/guide/arrival/", {
            params: {
              query: { country, city: city || undefined, arrived_on: arrivedOn || undefined },
            },
          }),
        )) as unknown as { items: ArrivalItem[] }
      ).items,
    enabled: Boolean(country),
  });
}

export function useSetArrivalDone(country: string, city: string, arrivedOn: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, done }: { itemId: string; done: boolean }) =>
      unwrap(
        ai.PUT("/api/ai/v1/me/arrival/{item_id}/", {
          params: { path: { item_id: itemId } },
          body: { done },
        }),
      ),
    onSuccess: () =>
      void client.invalidateQueries({ queryKey: guidanceKeys.arrival(country, city, arrivedOn) }),
  });
}
