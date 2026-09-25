import { describe, expect, it } from "vitest";
import { safeNext } from "./safe-next";

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
