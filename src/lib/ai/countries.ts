/**
 * Countries by ISO 3166-1 alpha-2 code, named by the browser (Intl) so there
 * is no list to ship or keep current. Nigeria and its neighbours in the
 * product's markets come first; the rest are alphabetical.
 */

const FIRST = ["NG", "GH", "KE", "ZA", "CM"];

/** False for a retired code that Intl maps to a newer one. */
function canonical(code: string): boolean {
  try {
    return Intl.getCanonicalLocales(`und-${code}`)[0] === `und-${code}`;
  } catch {
    return false;
  }
}

let cache: { code: string; name: string }[] | null = null;

export function countryName(code: string): string {
  try {
    return new Intl.DisplayNames(["en-GB"], { type: "region", fallback: "none" }).of(code) ?? code;
  } catch {
    return code;
  }
}

export function countries(): { code: string; name: string }[] {
  if (cache) return cache;
  const names = new Intl.DisplayNames(["en-GB"], { type: "region", fallback: "none" });
  const all: { code: string; name: string }[] = [];
  for (let a = 65; a <= 90; a++) {
    for (let b = 65; b <= 90; b++) {
      const code = String.fromCharCode(a, b);
      let name: string | undefined;
      try {
        name = names.of(code);
      } catch {
        name = undefined;
      }
      // Reserved and user-assigned codes have no name (or a placeholder one);
      // retired codes (DY for Benin, ZR for Congo) canonicalise to their successor.
      if (
        name &&
        canonical(code) &&
        name !== code &&
        !/unknown/i.test(name) &&
        !["EU", "EZ", "UN", "QO", "XA", "XB"].includes(code)
      ) {
        all.push({ code, name });
      }
    }
  }
  all.sort((x, y) => x.name.localeCompare(y.name, "en-GB"));
  cache = [
    ...FIRST.map((code) => all.find((country) => country.code === code)!).filter(Boolean),
    ...all.filter((country) => !FIRST.includes(country.code)),
  ];
  return cache;
}
