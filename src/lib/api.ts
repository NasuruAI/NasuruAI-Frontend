/**
 * Backend client.
 *
 * The API lives on Render/Railway/Fly, not on Vercel — Django needs a
 * long-lived process for webhooks, uploads and Celery, which serverless
 * functions cannot provide (plan §2.1). This client therefore always talks to
 * an absolute origin, never a co-located route.
 */

import type { FieldErrors } from "@/types";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ?? "http://localhost:8010";

export const API_ERROR_TOAST_EVENT = "nasuru:api-error";

type ApiErrorToastDetail = {
  message: string;
  tone: "info" | "success" | "error";
};

export function publishToast(message: string, tone: ApiErrorToastDetail["tone"] = "error"): void {
  if (typeof window === "undefined" || !message.trim()) return;
  window.dispatchEvent(
    new CustomEvent<ApiErrorToastDetail>(API_ERROR_TOAST_EVENT, {
      detail: { message, tone },
    }),
  );
}

function publishApiErrorToast(message: string, status: number, code: string): void {
  if (
    code === "mfa_required" ||
    code === "access_fee_required" ||
    (status === 401 && code !== "invalid_credentials" && code !== "mfa_invalid")
  ) {
    return;
  }
  publishToast(message, "error");
}

export class ApiError extends Error {
  status: number;
  /** Per-field messages, keyed the same way the form schema keys fields. */
  fieldErrors: FieldErrors;
  code: string;

  constructor(message: string, status: number, fieldErrors: FieldErrors = {}, code = "") {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.fieldErrors = fieldErrors;
    this.code = code;
  }

  /** True when the student simply hasn't paid yet — a prompt, not a failure. */
  get needsAccessFee(): boolean {
    return this.status === 403 && this.code === "access_fee_required";
  }
}

type RequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
  token?: string | null;
};

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, token, headers, ...rest } = options;

  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...rest,
      headers: {
        Accept: "application/json",
        ...(isFormData ? {} : body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      body: isFormData ? (body as FormData) : body !== undefined ? JSON.stringify(body) : undefined,
      credentials: "include",
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") throw error;
    const message = "Unable to connect to the server. Check your connection and try again.";
    publishApiErrorToast(message, 0, "network_error");
    throw new ApiError(message, 0, {}, "network_error");
  }

  if (response.status === 204) return undefined as T;

  const text = await response.text();
  let payload: unknown = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = { detail: text };
  }

  if (!response.ok) throw apiErrorFrom(response.status, payload);

  return payload as T;
}

/** The API's error body (`detail`, `code`, per-field lists) as an ApiError. */
export function apiErrorFrom(status: number, payload: unknown): ApiError {
  const data = (payload && typeof payload === "object" ? payload : {}) as Record<string, unknown>;
  const detail = typeof data.detail === "string" ? data.detail : `Request failed (${status}).`;
  const fieldErrors: FieldErrors = {};
  for (const [key, value] of Object.entries(data)) {
    if (key === "detail" || key === "code") continue;
    fieldErrors[key] = Array.isArray(value) ? value.map(String) : [String(value)];
  }
  const code = String(data.code ?? "");
  publishApiErrorToast(detail, status, code);
  return new ApiError(detail, status, fieldErrors, code);
}

export const api = {
  get: <T>(path: string, token?: string | null) => apiFetch<T>(path, { method: "GET", token }),
  post: <T>(path: string, body?: unknown, token?: string | null) =>
    apiFetch<T>(path, { method: "POST", body, token }),
  patch: <T>(path: string, body?: unknown, token?: string | null) =>
    apiFetch<T>(path, { method: "PATCH", body, token }),
  delete: <T>(path: string, token?: string | null) =>
    apiFetch<T>(path, { method: "DELETE", token }),
};
