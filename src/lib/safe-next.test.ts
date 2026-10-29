import { describe, expect, it } from "vitest";
import { redirectToAi, safeNext } from "./safe-next";

describe("safeNext", () => {
  it("keeps paths on this site, with their query", () => {
    expect(safeNext("/ai/plan")).toBe("/ai/plan");
    expect(safeNext("/ai/jobs?sort=recent#top")).toBe("/ai/jobs?sort=recent#top");
  });

  it.each([
    "https://evil.example/ai/plan",
    "//evil.example",
    String.raw`/\evil.example`, // browsers read "/\" as "//"
    "javascript:alert(1)",
    "ai/plan",
    "",
    null,
  ])("refuses %s", (raw) => {
    expect(safeNext(raw)).toBe("/dashboard");
  });
});

describe("redirectToAi", () => {
  it("redirects non-AI pages to the same route under /ai", () => {
    expect(redirectToAi("/")).toBe("/ai");
    expect(redirectToAi("/login")).toBe("/ai/login");
    expect(redirectToAi("/dashboard")).toBe("/ai/dashboard");
  });

  it("keeps /ai routes, API calls and internal assets alone", () => {
    expect(redirectToAi("/ai/plan")).toBeNull();
    expect(redirectToAi("/api/auth/login/")).toBeNull();
    expect(redirectToAi("/_next/static/chunks/app.js")).toBeNull();
    expect(redirectToAi("/favicon.ico")).toBeNull();
  });
});
