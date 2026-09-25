import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api";
import { clearTokens, getAccessToken, getRefreshToken, setTokens } from "@/lib/auth/store";
import { ai, unwrap } from "./client";
import { shouldRetry } from "./QueryProvider";

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

type Handler = (url: string, auth: string | null) => Response | Promise<Response>;

function mockFetch(handler: Handler) {
  const calls: { url: string; auth: string | null }[] = [];
  const fn = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = input instanceof Request ? input : new Request(String(input), init);
    const auth = request.headers.get("Authorization");
    calls.push({ url: request.url, auth });
    return handler(request.url, auth);
  });
  vi.stubGlobal("fetch", fn);
  return calls;
}

beforeEach(() => {
  clearTokens();
  window.localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("the Nasuru AI client", () => {
  it("sends the session token", async () => {
    setTokens({ access: "access-1", refresh: "refresh-1" });
    const calls = mockFetch(() => json(200, { id: "c1" }));
    await unwrap(ai.GET("/api/ai/v1/me/"));
    expect(calls[0].auth).toBe("Bearer access-1");
  });

  it("refreshes once for requests that hit 401 together, then replays each", async () => {
    setTokens({ access: "expired", refresh: "refresh-1" });
    let refreshes = 0;
    const calls = mockFetch(async (url, auth) => {
      if (url.endsWith("/api/auth/token/refresh/")) {
        refreshes += 1;
        await new Promise((resolve) => setTimeout(resolve, 10));
        return json(200, { access: "access-2", refresh: "refresh-2" });
      }
      return auth === "Bearer access-2"
        ? json(200, { ok: true })
        : json(401, { detail: "expired" });
    });

    const results = await Promise.all([
      unwrap(ai.GET("/api/ai/v1/me/")),
      unwrap(ai.GET("/api/ai/v1/me/eligibility/")),
      unwrap(ai.GET("/api/ai/v1/me/plan/")),
    ]);

    expect(results).toHaveLength(3);
    // The server blacklists a rotated refresh token: two refreshes would sign
    // the person out, so there must be exactly one.
    expect(refreshes).toBe(1);
    expect(getAccessToken()).toBe("access-2");
    expect(getRefreshToken()).toBe("refresh-2");
    const replays = calls.filter((c) => c.auth === "Bearer access-2");
    expect(replays).toHaveLength(3);
  });

  it("signs out cleanly when the refresh is refused", async () => {
    setTokens({ access: "expired", refresh: "revoked" });
    mockFetch((url) =>
      url.endsWith("/api/auth/token/refresh/")
        ? json(401, { detail: "Token is blacklisted" })
        : json(401, { detail: "Authentication credentials were not provided." }),
    );
    await expect(unwrap(ai.GET("/api/ai/v1/me/"))).rejects.toMatchObject({ status: 401 });
    expect(getAccessToken()).toBeNull();
    expect(getRefreshToken()).toBeNull();
  });

  it("does not try to refresh when there was no session", async () => {
    let refreshes = 0;
    mockFetch((url) => {
      if (url.endsWith("/api/auth/token/refresh/")) refreshes += 1;
      return json(401, { detail: "Authentication credentials were not provided." });
    });
    await expect(unwrap(ai.GET("/api/ai/v1/me/"))).rejects.toBeInstanceOf(ApiError);
    expect(refreshes).toBe(0);
  });

  it("turns the server's error body into an ApiError with its code and field errors", async () => {
    setTokens({ access: "access-1" });
    mockFetch(() =>
      json(409, { detail: "The card moved.", code: "conflict", notes: ["Too long."] }),
    );
    const error = await unwrap(ai.GET("/api/ai/v1/me/")).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 409,
      code: "conflict",
      message: "The card moved.",
      fieldErrors: { notes: ["Too long."] },
    });
  });
});

describe("retry policy", () => {
  it("retries network failures, 5xx and 429 at most twice", () => {
    expect(shouldRetry(0, new TypeError("Failed to fetch"))).toBe(true);
    expect(shouldRetry(1, new ApiError("down", 503))).toBe(true);
    expect(shouldRetry(0, new ApiError("slow down", 429))).toBe(true);
    expect(shouldRetry(2, new ApiError("down", 503))).toBe(false);
  });

  it("never retries a 4xx, which cannot fix itself", () => {
    for (const status of [400, 401, 403, 404, 409, 422]) {
      expect(shouldRetry(0, new ApiError("no", status))).toBe(false);
    }
  });
});
