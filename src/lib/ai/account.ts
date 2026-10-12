"use client";

/**
 * Account (web.md §12, web-build F14): notification preferences, devices,
 * the browser extension, the Gmail connection, your data, and plans sit
 * under /profile, /settings/[section] and /billing.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError } from "@/lib/api";
import { fileName } from "./packs";
import { ai, unwrap } from "./client";
import type { components } from "./schema";

type Schemas = components["schemas"];
export type Device = Schemas["Device"];
export type ExtensionToken = Schemas["ExtensionToken"];
export type InboxConnection = Schemas["InboxConnection"];
export type Category = Schemas["PreferenceChangeCategoryEnum"];
export type Channel = Schemas["PreferenceChangeChannelEnum"];

export type NotifyChannel = { channel: string; label: string; connected: boolean };
export type NotifyCategory = {
  category: string;
  label: string;
  always_email: boolean;
  channels: Record<string, boolean>;
};
export type Preferences = {
  channels: NotifyChannel[];
  categories: NotifyCategory[];
  quiet_hours: { start: string | null; end: string | null };
  daily_cap: number;
};

export type DataExport = {
  id: string;
  status: "pending" | "ready" | "failed";
  size_bytes: number | null;
  expires_at: string | null;
  created_at: string;
};

export const accountKeys = {
  preferences: ["ai", "account", "preferences"] as const,
  devices: ["ai", "account", "devices"] as const,
  extensionTokens: ["ai", "account", "extension-tokens"] as const,
  inbox: ["ai", "account", "inbox"] as const,
  exports: ["ai", "account", "exports"] as const,
};

// --- Notification preferences, including quiet hours --------------------

export function usePreferences() {
  return useQuery({
    queryKey: accountKeys.preferences,
    queryFn: async () =>
      (await unwrap(ai.GET("/api/ai/v1/me/notifications/preferences/"))) as unknown as Preferences,
  });
}

export function useSetPreference() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      category,
      channel,
      enabled,
    }: {
      category: string;
      channel: string;
      enabled: boolean;
    }) =>
      unwrap(
        ai.PUT("/api/ai/v1/me/notifications/preferences/", {
          body: { changes: [{ category, channel, enabled }] as never },
        }),
      ) as unknown as Promise<Preferences>,
    onSuccess: (data) => client.setQueryData(accountKeys.preferences, data),
  });
}

export function useSetQuietHours() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ start, end }: { start: string | null; end: string | null }) =>
      unwrap(
        ai.PUT("/api/ai/v1/me/notifications/preferences/", {
          body: { changes: [], quiet_hours: { start, end } },
        }),
      ) as unknown as Promise<Preferences>,
    onSuccess: (data) => client.setQueryData(accountKeys.preferences, data),
  });
}

// --- Devices (push-notification tokens) ----------------------------------

export function useDevices() {
  return useQuery({
    queryKey: accountKeys.devices,
    queryFn: () => unwrap(ai.GET("/api/ai/v1/me/devices/")),
  });
}

export function useRemoveDevice() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (deviceId: string) =>
      unwrap(
        ai.DELETE("/api/ai/v1/me/devices/{device_id}/", {
          params: { path: { device_id: deviceId } },
        }),
      ),
    onSuccess: () => void client.invalidateQueries({ queryKey: accountKeys.devices }),
  });
}

// --- Browser extension -----------------------------------------------------

export function useExtensionTokens() {
  return useQuery({
    queryKey: accountKeys.extensionTokens,
    queryFn: () => unwrap(ai.GET("/api/ai/v1/me/extension/tokens/")),
  });
}

export function useRequestPairingCode() {
  return useMutation({
    mutationFn: () =>
      unwrap(ai.POST("/api/ai/v1/me/extension/pairing-code/")) as unknown as Promise<{
        code: string;
        expires_in_seconds: number;
      }>,
  });
}

export function useRevokeExtensionToken() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (tokenId: string) =>
      unwrap(
        ai.DELETE("/api/ai/v1/me/extension/tokens/{token_id}/", {
          params: { path: { token_id: tokenId } },
        }),
      ),
    onSuccess: () => void client.invalidateQueries({ queryKey: accountKeys.extensionTokens }),
  });
}

// --- Gmail connection (US-504) --------------------------------------------

export function useInboxConnection() {
  return useQuery({
    queryKey: accountKeys.inbox,
    queryFn: async () => {
      try {
        return (await unwrap(ai.GET("/api/ai/v1/me/inbox/"))) as unknown as InboxConnection;
      } catch {
        return null;
      }
    },
  });
}

export function useConnectInbox() {
  return useMutation({
    mutationFn: () =>
      unwrap(ai.POST("/api/ai/v1/me/inbox/connect/")) as unknown as Promise<{
        authorization_url: string;
      }>,
  });
}

export function useDisconnectInbox() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => unwrap(ai.DELETE("/api/ai/v1/me/inbox/")),
    onSuccess: () => void client.invalidateQueries({ queryKey: accountKeys.inbox }),
  });
}

export function useSyncInbox() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () =>
      unwrap(ai.POST("/api/ai/v1/me/inbox/sync/")) as unknown as Promise<{ suggestions: number }>,
    onSuccess: () => void client.invalidateQueries({ queryKey: accountKeys.inbox }),
  });
}

// --- Your data ---------------------------------------------------------------

export function useDataExports() {
  return useQuery({
    queryKey: accountKeys.exports,
    queryFn: async () =>
      (await unwrap(ai.GET("/api/ai/v1/me/data/exports/"))) as unknown as DataExport[],
  });
}

export function useRequestExport() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () =>
      unwrap(
        ai.POST("/api/ai/v1/me/data/exports/", {
          headers: { "Idempotency-Key": crypto.randomUUID() },
        }),
      ),
    onSuccess: () => void client.invalidateQueries({ queryKey: accountKeys.exports }),
  });
}

/** Downloads need the session token, so they're fetched and saved, not linked. */
export async function downloadExport(exportId: string) {
  const { data, response } = await ai.GET("/api/ai/v1/me/data/exports/{export_id}/download/", {
    params: { path: { export_id: exportId } },
    parseAs: "blob",
  });
  if (!response.ok || !data)
    throw new ApiError("That download didn't work. Try again.", response.status);
  const url = URL.createObjectURL(data as Blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName(response.headers.get("Content-Disposition"), "nasuru-ai-data.zip");
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function useRequestErasure() {
  return useMutation({
    mutationFn: ({ password, confirm }: { password: string; confirm: string }) =>
      unwrap(ai.POST("/api/ai/v1/me/data/erase/", { body: { password, confirm } })),
  });
}

// --- Billing: plans, checkout, cancel, invoices ---------------------------

export type Plan = Schemas["Plan"];
export type Payment = Schemas["Payment"];

export const billingKeys = {
  plans: ["ai", "account", "plans"] as const,
  payments: ["ai", "account", "payments"] as const,
};

export function usePlans() {
  return useQuery({
    queryKey: billingKeys.plans,
    queryFn: () => unwrap(ai.GET("/api/ai/v1/plans/")),
  });
}

export function usePayments() {
  return useQuery({
    queryKey: billingKeys.payments,
    queryFn: () => unwrap(ai.GET("/api/payments/mine/")),
  });
}

export function useCheckout() {
  return useMutation({
    mutationFn: (plan: string) =>
      unwrap(
        ai.POST("/api/ai/v1/me/subscription/checkout/", {
          body: { plan },
          headers: { "Idempotency-Key": crypto.randomUUID() },
        }),
      ) as unknown as Promise<{ order_id: string; reference: string; checkout_url: string }>,
  });
}

export function useCancelSubscription() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => unwrap(ai.POST("/api/ai/v1/me/subscription/cancel/")),
    onSuccess: () => void client.invalidateQueries({ queryKey: ["ai", "entitlements"] }),
  });
}

export function verifyPayment(reference: string) {
  return unwrap(
    ai.POST("/api/payments/verify/", { body: { reference } }),
  ) as unknown as Promise<Payment>;
}
