"use client";

/**
 * Nasuru AI sign-up and sign-in (web-build F4, US-001).
 *
 * Phone first: one code both signs up a new number and signs in an existing
 * one, and nothing before a correct code says which. Email and password stay
 * for people who prefer them.
 */

import { api, ApiError } from "@/lib/api";
import { setTokens, type SessionUser } from "@/lib/auth/store";

export type Channel = "sms" | "whatsapp";

export type CodeSent = {
  channel: Channel;
  expires_at: string;
  /** When WhatsApp delivery may be offered instead of SMS. */
  whatsapp_available_at: string;
};

export type SignedIn = { user: SessionUser; created: boolean };

type TokenResponse = { user: SessionUser; tokens: { access: string; refresh: string } };

export function requestPhoneCode(phone: string, channel: Channel = "sms") {
  return api.post<CodeSent>("/api/auth/phone/code/", { phone, channel });
}

export async function verifyPhoneCode(input: {
  phone: string;
  code: string;
  accept_terms?: boolean;
  first_name?: string;
  last_name?: string;
}): Promise<SignedIn> {
  const response = await api.post<TokenResponse & { created: boolean }>(
    "/api/auth/phone/verify/",
    input,
  );
  setTokens(response.tokens);
  return { user: response.user, created: response.created };
}

export async function emailSignIn(input: {
  email: string;
  password: string;
  otp?: string;
}): Promise<SignedIn> {
  const response = await api.post<TokenResponse>("/api/auth/login/", input);
  setTokens(response.tokens);
  return { user: response.user, created: false };
}

export async function emailSignUp(input: {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  accept_terms: boolean;
}): Promise<SignedIn> {
  const response = await api.post<TokenResponse>("/api/auth/signup/", input);
  setTokens(response.tokens);
  return { user: response.user, created: true };
}

/** When a refused request may be tried again (`retry_at` on 429s), if the API said. */
export function retryAt(error: unknown): Date | null {
  if (!(error instanceof ApiError)) return null;
  const raw = error.fieldErrors.retry_at?.[0];
  const at = raw ? new Date(raw) : null;
  return at && !Number.isNaN(at.getTime()) ? at : null;
}

/** "0:42", "12:05": time left, for a countdown. */
export function formatWait(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

/** "+234 803 123 4567" for a Nigerian number, the input as typed otherwise. */
export function displayPhone(e164: string): string {
  const match = /^\+234(\d{3})(\d{3})(\d{4})$/.exec(e164);
  return match ? `+234 ${match[1]} ${match[2]} ${match[3]}` : e164;
}

/** Where a new account goes first, and where a returning one lands. */
export const AFTER_SIGN_UP = "/ai/start";
export const AFTER_SIGN_IN = "/ai/plan";
