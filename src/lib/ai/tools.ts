/**
 * Free public tools (web.md §3.3, web-build F16): typed-in inputs, no account,
 * server-rendered and indexable. Plain data + pure helpers only (no "use
 * client"), so the server-rendered tool pages can import the tool definitions;
 * the React Query hook that posts to the public `tools/points/<scheme>/`
 * endpoint lives in the client view.
 */

export type ToolField =
  | { key: string; label: string; type: "number"; min?: number; max?: number; help?: string }
  | { key: string; label: string; type: "switch"; help?: string }
  | {
      key: string;
      label: string;
      type: "select";
      options: { value: string; label: string }[];
      help?: string;
    }
  | { key: string; label: string; type: "clb"; help?: string };

export type PointsTool = {
  scheme: string;
  country: string;
  title: string;
  blurb: string;
  fields: ToolField[];
};

const CEFR_OPTIONS = [
  { value: "", label: "Not sure" },
  { value: "A1", label: "A1" },
  { value: "A2", label: "A2" },
  { value: "B1", label: "B1" },
  { value: "B2", label: "B2" },
  { value: "C1", label: "C1" },
  { value: "C2", label: "C2" },
  { value: "native", label: "Native" },
];

export const POINTS_TOOLS: Record<string, PointsTool> = {
  crs: {
    scheme: "ca_crs",
    country: "CA",
    title: "Canada Express Entry (CRS)",
    blurb: "Your Comprehensive Ranking System score, with the latest draw cut-off and its source.",
    fields: [
      { key: "age", label: "Your age", type: "number", min: 16, max: 100 },
      { key: "with_spouse", label: "Applying with a spouse or partner", type: "switch" },
      {
        key: "education",
        label: "Highest education",
        type: "select",
        options: [
          { value: "none", label: "None of these" },
          { value: "secondary", label: "Secondary school" },
          { value: "one_year", label: "One-year post-secondary" },
          { value: "two_year", label: "Two-year diploma" },
          { value: "bachelor", label: "Bachelor's degree" },
          { value: "two_or_more", label: "Two or more credentials" },
          { value: "master", label: "Master's degree" },
          { value: "doctorate", label: "Doctorate (PhD)" },
        ],
      },
      { key: "first_language_clb", label: "English level (CLB)", type: "clb" },
      {
        key: "foreign_work_years",
        label: "Years of skilled work (outside Canada)",
        type: "number",
        min: 0,
        max: 50,
      },
      {
        key: "canadian_work_years",
        label: "Years of skilled work in Canada",
        type: "number",
        min: 0,
        max: 50,
      },
      {
        key: "canadian_study",
        label: "Studied in Canada",
        type: "select",
        options: [
          { value: "none", label: "No" },
          { value: "1_2", label: "1–2 year programme" },
          { value: "3_plus", label: "3+ year programme" },
        ],
      },
      { key: "sibling", label: "Sibling who is a Canadian citizen or PR", type: "switch" },
      { key: "provincial_nomination", label: "Have a provincial nomination", type: "switch" },
    ],
  },
  "opportunity-card": {
    scheme: "de_opportunity_card",
    country: "DE",
    title: "Germany Opportunity Card (Chancenkarte)",
    blurb:
      "The points-based job-seeker route: clear the six-point line to qualify. Blocked-account amount shown in ₦.",
    fields: [
      {
        key: "qualification",
        label: "Your qualification",
        type: "select",
        options: [
          { value: "", label: "Not sure" },
          { value: "degree", label: "University degree" },
          { value: "vocational", label: "Vocational qualification" },
        ],
      },
      {
        key: "recognition",
        label: "German recognition of your qualification",
        type: "select",
        options: [
          { value: "none", label: "Not recognised" },
          { value: "partial", label: "Partly recognised" },
        ],
      },
      { key: "shortage_occupation", label: "Work in a shortage occupation", type: "switch" },
      {
        key: "years_last_five",
        label: "Years of experience in the last 5",
        type: "number",
        min: 0,
        max: 5,
      },
      { key: "german", label: "German level", type: "select", options: CEFR_OPTIONS },
      { key: "english", label: "English level", type: "select", options: CEFR_OPTIONS },
      { key: "age", label: "Your age", type: "number", min: 16, max: 100 },
      { key: "previous_stay", label: "Previous stay in Germany (study or work)", type: "switch" },
      { key: "partner_eligible", label: "Partner also applying and eligible", type: "switch" },
    ],
  },
  "uk-points": {
    scheme: "gb_skilled_worker",
    country: "GB",
    title: "UK Skilled Worker points",
    blurb:
      "The 70-point Skilled Worker test: a sponsored job, the skill level, English, and salary.",
    fields: [
      { key: "sponsored_offer", label: "Have a job offer from a licensed sponsor", type: "switch" },
      {
        key: "skill_level_ok",
        label: "Job is at the required skill level (RQF 3+)",
        type: "switch",
      },
      { key: "english_b2", label: "English at B2 (IELTS ~5.5–6.0)", type: "switch" },
      {
        key: "salary",
        label: "Annual salary offered (£)",
        type: "number",
        min: 0,
        help: "The gross yearly salary in pounds.",
      },
      { key: "age", label: "Your age", type: "number", min: 16, max: 100 },
    ],
  },
};

export const POINTS_TOOL_SLUGS = Object.keys(POINTS_TOOLS);

export function isPointsTool(slug: string): boolean {
  return slug in POINTS_TOOLS;
}

/** Build the API `inputs` object from the form's raw string/boolean values. */
export function buildInputs(
  fields: ToolField[],
  values: Record<string, string | boolean>,
): Record<string, unknown> {
  const inputs: Record<string, unknown> = {};
  for (const field of fields) {
    const raw = values[field.key];
    if (field.type === "switch") {
      if (raw) inputs[field.key] = true;
    } else if (field.type === "number") {
      if (raw !== "" && raw !== undefined) inputs[field.key] = Number(raw);
    } else if (field.type === "clb") {
      if (raw !== "" && raw !== undefined) {
        const n = Number(raw);
        inputs[field.key] = { listening: n, reading: n, writing: n, speaking: n };
      }
    } else if (typeof raw === "string" && raw !== "") {
      inputs[field.key] = raw;
    }
  }
  return inputs;
}
