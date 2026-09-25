"use client";

/**
 * Data the app shell shows on every page: the candidate, their destination,
 * their plan and quota, notifications and rule changes (web.md §1).
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSyncExternalStore } from "react";
import { ai, unwrap } from "./client";
import type { components } from "./schema";

export type DestinationStatus = components["schemas"]["DestinationStatus"];
export type Entitlements = components["schemas"]["Entitlements"];
export type InboxItem = components["schemas"]["Inbox"];
export type RuleChange = components["schemas"]["EligibilityChange"];

/** The seven destinations (apps.candidates.models.DESTINATIONS), in display order. */
export const DESTINATIONS = ["DE", "GB", "CA", "IE", "NL", "CH", "US"] as const;

export const shellKeys = {
  me: ["ai", "me"] as const,
  destination: ["ai", "destination"] as const,
  entitlements: ["ai", "entitlements"] as const,
  inbox: ["notifications", "inbox"] as const,
  changes: ["ai", "changes"] as const,
};

export function useMe() {
  return useQuery({ queryKey: shellKeys.me, queryFn: () => unwrap(ai.GET("/api/ai/v1/me/")) });
}

export function useDestination() {
  return useQuery({
    queryKey: shellKeys.destination,
    queryFn: () => unwrap(ai.GET("/api/ai/v1/me/destination/")),
  });
}

/** Choose or switch destination. Idempotent: a double tap switches once. */
export function useChooseDestination() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (country: string) =>
      unwrap(
        ai.POST("/api/ai/v1/me/destination/", {
          body: { country },
          headers: { "Idempotency-Key": crypto.randomUUID() },
        }),
      ),
    onSuccess: (status) => {
      client.setQueryData(shellKeys.destination, status);
      // Everything below the shell is per-destination: refetch it all.
      void client.invalidateQueries({ queryKey: ["ai"] });
    },
  });
}

export function useEntitlements() {
  return useQuery({
    queryKey: shellKeys.entitlements,
    queryFn: () => unwrap(ai.GET("/api/ai/v1/me/subscription/")),
  });
}

export function useInbox() {
  return useQuery({
    queryKey: shellKeys.inbox,
    queryFn: () => unwrap(ai.GET("/api/notifications/")),
    refetchInterval: 60_000,
  });
}

export function useMarkAllRead() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => unwrap(ai.POST("/api/notifications/")),
    onSuccess: () => void client.invalidateQueries({ queryKey: shellKeys.inbox }),
  });
}

export function useRuleChanges() {
  return useQuery({
    queryKey: shellKeys.changes,
    queryFn: () => unwrap(ai.GET("/api/ai/v1/me/changes/")),
  });
}

/** "Today", "This week" or "Earlier", by local calendar day. */
export function inboxGroup(
  createdAt: string,
  now: Date = new Date(),
): "Today" | "This week" | "Earlier" {
  const created = new Date(createdAt);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (created >= startOfToday) return "Today";
  const weekAgo = new Date(startOfToday);
  weekAgo.setDate(weekAgo.getDate() - 6);
  return created >= weekAgo ? "This week" : "Earlier";
}

/** "2/∞" style quota for the plan chip; null when the meter is unknown. */
export function quotaLabel(
  entitlements: Entitlements | undefined,
  meter = "answer_pack",
): string | null {
  const value = entitlements?.meters?.[meter];
  if (!value) return null;
  return `${value.used}/${value.limit ?? "∞"}`;
}

function subscribeOnline(callback: () => void) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

/** navigator.onLine as React state; true on the server. */
export function useOnline(): boolean {
  return useSyncExternalStore(
    subscribeOnline,
    () => navigator.onLine,
    () => true,
  );
}
