import { describe, expect, it } from "vitest";
import { countries, countryName } from "./countries";

describe("countries", () => {
  it("puts Nigeria first and lists each country once", () => {
    const list = countries();
    expect(list[0]).toEqual({ code: "NG", name: "Nigeria" });
    const names = list.map((country) => country.name);
    expect(new Set(names).size).toBe(names.length);
    // Retired codes are left out: DY was Benin before BJ.
    expect(list.some((country) => country.code === "DY")).toBe(false);
    expect(list.some((country) => country.code === "BJ")).toBe(true);
    expect(list.length).toBeGreaterThan(200);
  });

  it("names a code", () => {
    expect(countryName("GB")).toBe("United Kingdom");
  });
});
