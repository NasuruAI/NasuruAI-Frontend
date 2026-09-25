/**
 * The points calculators (web.md §6.4): which page shows which scheme. Plain
 * data, free of "use client", so the calculator route can list its pages.
 */

export const CALCULATORS = {
  crs: { scheme: "ca_crs", country: "CA", title: "Canada Express Entry (CRS)" },
  "opportunity-card": {
    scheme: "de_opportunity_card",
    country: "DE",
    title: "Germany Opportunity Card",
  },
  "uk-points": { scheme: "gb_skilled_worker", country: "GB", title: "UK Skilled Worker points" },
} as const;

export type CalculatorKind = keyof typeof CALCULATORS;

export const CALCULATOR_KINDS = Object.keys(CALCULATORS) as CalculatorKind[];

export function isCalculatorKind(kind: string): kind is CalculatorKind {
  return kind in CALCULATORS;
}

/** The calculator for a destination, if it has one. */
export function calculatorFor(country: string | null | undefined): CalculatorKind | null {
  const found = (Object.keys(CALCULATORS) as CalculatorKind[]).find(
    (kind) => CALCULATORS[kind].country === country,
  );
  return found ?? null;
}
