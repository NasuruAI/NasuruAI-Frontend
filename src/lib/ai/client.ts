/**
 * The typed Nasuru AI client.
 *
 * Paths, parameters and response shapes come from `schema.d.ts`, generated from
 * the backend's OpenAPI schema (`npm run api:types`). A renamed field or a
 * removed endpoint is a type error here, not a blank screen in production.
 *
 * Auth is the agency session (`@/lib/auth/store`): the bearer token rides on
 * every request, and a 401 refreshes once through the same single-flight
 * refresh the rest of the site uses, then replays the request.
 */

import createClient from "openapi-fetch";
import { API_BASE_URL, ApiError, apiErrorFrom } from "@/lib/api";
import { refreshAccessToken } from "@/lib/auth/client";
import { getAccessToken } from "@/lib/auth/store";
import type { paths } from "./schema";

function withToken(request: Request): Request {
  const token = getAccessToken();
  if (!token) return request;
  const headers = new Headers(request.headers);
  headers.set("Authorization", `Bearer ${token}`);
  return new Request(request, { headers });
}

/** fetch with the session token, refreshing once on a 401. */
async function authedFetch(input: Request): Promise<Response> {
  // Cloned before sending: a request body can be read only once, and the
  // replay after a refresh needs it again.
  const replay = input.clone();
  const response = await fetch(withToken(input));
  if (response.status !== 401 || !getAccessToken()) return response;
  if (!(await refreshAccessToken())) return response;
  return fetch(withToken(replay));
}

export const ai = createClient<paths>({
  baseUrl: API_BASE_URL,
  fetch: authedFetch,
  credentials: "include",
});

type Result<T> = { data?: T; error?: unknown; response: Response };

/**
 * The data, or an ApiError carrying the server's `detail`, `code` and field
 * errors. For use inside TanStack Query functions and mutations:
 *
 *     queryFn: () => unwrap(ai.GET("/api/ai/v1/me/"))
 */
export async function unwrap<T>(call: Promise<Result<T>>): Promise<T> {
  const { data, error, response } = await call;
  if (!response.ok) throw apiErrorFrom(response.status, error);
  return data as T;
}

export { ApiError };
