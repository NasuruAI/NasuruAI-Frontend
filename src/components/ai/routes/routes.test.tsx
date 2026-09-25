import { QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AnnouncerProvider } from "@/components/ui/Announcer";
import { ai } from "@/lib/ai/client";
import type { CompareRow, EligibilityResult } from "@/lib/ai/onboarding";
import { makeQueryClient } from "@/lib/ai/QueryProvider";
import {
  calculatorFor,
  checkedAt,
  isCalculatorKind,
  type PointsResult,
  routeCosts,
  slugKey,
  topUnlocks,
} from "@/lib/ai/routes";
import { ToastProvider } from "../Toast";
import { mergeOverrides, thresholdOf } from "./CalculatorView";
import { type CompareLine, openCount, sortLines } from "./CompareView";
import { formatValue, humanise, RouteView } from "./RouteView";

vi.mock("@/lib/ai/client", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/ai/client")>();
  return { ...original, ai: { GET: vi.fn(), POST: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() } };
});

const api = ai as unknown as Record<"GET" | "POST" | "PATCH" | "DELETE", ReturnType<typeof vi.fn>>;
const ok = (data: unknown, status = 200) =>
  Promise.resolve({ data, response: new Response(null, { status }) });

afterEach(() => vi.resetAllMocks());

const result = (
  code: string,
  status: EligibilityResult["status"],
  gaps: { key: string; text: string }[] = [],
  computed_at = "2026-09-20T10:00:00Z",
): EligibilityResult => ({
  route: {
    id: code,
    code,
    country: "DE",
    name: `Route ${code}`,
    family: "work",
    leads_to_pr: false,
    typical_months_to_arrival: 5,
  } as EligibilityResult["route"],
  status,
  gaps,
  reasons: [],
  uses_stale_rules: false,
  computed_at,
});

describe("route helpers", () => {
  it("ranks the gaps that open the most routes, leaving out ours and closed routes", () => {
    const unlocks = topUnlocks([
      result("a", "eligible_if", [
        { key: "english", text: "English at B2." },
        { key: "offer", text: "A job offer." },
      ]),
      result("b", "eligible_if", [{ key: "english", text: "English at B2." }]),
      result("c", "not_eligible", [
        { key: "english", text: "English at B2." },
        { key: "stale", text: "Awaiting re-check." },
      ]),
      result("d", "blocked", [{ key: "offer", text: "A job offer." }]),
      result("e", "eligible_if", [{ key: "rules_pending", text: "Rules coming." }]),
    ]);
    expect(unlocks.map((unlock) => [unlock.key, unlock.routes.map((route) => route.code)])).toEqual(
      [
        ["english", ["a", "b", "c"]],
        ["offer", ["a"]],
      ],
    );
  });

  it("reports the newest check and each single-route cost", () => {
    expect(
      checkedAt([
        result("a", "eligible", [], "2026-09-20T10:00:00Z"),
        result("b", "eligible", [], "2026-09-24T08:00:00Z"),
      ]),
    ).toBe("2026-09-24T08:00:00Z");
    expect(checkedAt([])).toBeNull();
    expect(
      routeCosts([
        { codes: ["a"], cost: { spend_ngn: "4200000" } },
        { codes: ["a", "b"], cost: { spend_ngn: "9000000" } },
        { codes: ["c"], cost: { spend_ngn: "0" } },
      ]),
    ).toEqual({ a: 4_200_000 });
  });

  it("makes stable to-do keys and finds the right calculator", () => {
    expect(slugKey("Reach CLB 7 in French (TEF)!")).toBe("reach-clb-7-in-french-tef");
    expect(slugKey("€€€")).toBe("item");
    expect(calculatorFor("CA")).toBe("crs");
    expect(calculatorFor("IE")).toBeNull();
    expect(isCalculatorKind("uk-points")).toBe(true);
    expect(isCalculatorKind("../etc")).toBe(false);
  });

  it("writes rule values the way a person would", () => {
    expect(formatValue(null)).toBe("Not known");
    expect(formatValue(true)).toBe("Yes");
    expect(formatValue(41700, "GBP")).toBe("41,700 GBP");
    expect(formatValue(["B2", "C1"])).toBe("B2, C1");
    expect(formatValue({ english_level: "B2" })).toBe("English level: B2");
    expect(humanise("profile.years_of_experience")).toBe("Years of experience");
  });
});

describe("compare", () => {
  const row = (
    country: string,
    name: string,
    best: string | null,
    months: number,
    open: number,
  ): CompareLine => ({
    row: {
      country,
      name,
      best_status: best,
      best_route: best
        ? ({
            code: country,
            name: `${name} route`,
            typical_months_to_arrival: months,
          } as CompareRow["best_route"])
        : null,
      counts: { eligible: open, eligible_if: 0, not_eligible: 0, blocked: 0 },
    },
    open,
    lastChange: null,
  });
  const lines = [
    row("GB", "United Kingdom", "eligible_if", 6, 1),
    row("CA", "Canada", "eligible", 14, 2),
    row("IE", "Ireland", null, 0, 0),
  ];

  it("sorts by result, then flips", () => {
    const up = sortLines(lines, { key: "status", direction: "ascending" });
    expect(up.map((line) => line.row.country)).toEqual(["CA", "GB", "IE"]);
    const down = sortLines(lines, { key: "status", direction: "descending" });
    expect(down.map((line) => line.row.country)).toEqual(["IE", "GB", "CA"]);
    expect(sortLines(lines, { key: "months", direction: "ascending" })[0].row.country).toBe("GB");
    expect(openCount(lines[1].row)).toBe(2);
  });
});

describe("calculators", () => {
  const points = (patch: Partial<PointsResult>): PointsResult =>
    ({
      scheme: "ca_crs",
      total: 430,
      threshold: null,
      meets_threshold: null,
      lines: [],
      assumptions: [],
      what_ifs: [
        {
          change: "French at CLB 7",
          overrides: { second_language_nclc: { listening: 7 } },
          total: 480,
          gain: 50,
        },
        { change: "A year in Canada", overrides: { canadian_work_years: 1 }, total: 470, gain: 40 },
      ],
      source_name: "IRCC",
      source_url: "https://example.org",
      is_stale: false,
      inputs: {},
      ...patch,
    }) as PointsResult;

  it("uses the latest draw for CRS and the pass mark elsewhere", () => {
    expect(thresholdOf(points({ reference: { label: "Latest draw", value: 470 } }))).toEqual({
      points: 470,
      label: "the latest draw",
    });
    expect(thresholdOf(points({ threshold: 70 }))).toEqual({ points: 70, label: "the pass mark" });
    expect(thresholdOf(points({}))).toBeUndefined();
  });

  it("merges the chosen what-ifs", () => {
    const result = points({});
    expect(mergeOverrides(result.what_ifs, new Set())).toBeNull();
    expect(
      mergeOverrides(result.what_ifs, new Set(["French at CLB 7", "A year in Canada"])),
    ).toEqual({
      second_language_nclc: { listening: 7 },
      canadian_work_years: 1,
    });
  });
});

describe("RouteView", () => {
  const detail = {
    route: { code: "de-blue-card", name: "EU Blue Card" },
    status: "eligible_if",
    gaps: [{ key: "offer", text: "A job offer from an employer in Germany.", alternatives: [] }],
    reasons: [],
    uses_stale_rules: false,
    computed_at: "2026-09-25T10:00:00Z",
    profile_version: 3,
    ruleset_version: 7,
    trace: [
      {
        key: "degree",
        group: "",
        description: "A recognised degree.",
        outcome: "pass",
        inputs: { education_level: "bachelor" },
        value: null,
        unit: "",
        version_id: "11111111-aaaa",
        source_name: "Make it in Germany",
        source_url: "https://example.org/blue-card",
        verified_at: "2026-09-01T00:00:00Z",
        is_stale: false,
      },
      {
        key: "offer",
        group: "",
        description: "A job offer paying at least the threshold.",
        outcome: "unknown",
        inputs: {},
        value: 48300,
        unit: "EUR",
        version_id: "22222222-bbbb",
        source_name: "Make it in Germany",
        source_url: "https://example.org/blue-card",
        verified_at: "2026-09-01T00:00:00Z",
        is_stale: false,
      },
    ],
  };
  const route = {
    id: "r1",
    code: "de-blue-card",
    country: "DE",
    name: "EU Blue Card",
    family: "work",
    leads_to_pr: true,
    typical_months_to_arrival: 5,
    summary: "For graduates with a qualified job offer.",
    requirements: [],
    nationality_gates: [],
    leads_to: [],
  };

  function renderRoute() {
    api.GET.mockImplementation((path: string) => {
      if (path.includes("/me/eligibility/")) return ok(detail);
      if (path.includes("/routes/")) return ok(route);
      if (path.includes("/me/plan/")) return ok({ plan: null, todos: [], share: null });
      return ok([]);
    });
    render(
      <QueryClientProvider client={makeQueryClient()}>
        <AnnouncerProvider>
          <ToastProvider>
            <RouteView code="de-blue-card" />
          </ToastProvider>
        </AnnouncerProvider>
      </QueryClientProvider>,
    );
  }

  it("shows each requirement with your value, the result and its source", async () => {
    renderRoute();
    const table = await screen.findByRole("table");
    const rows = within(table).getAllByRole("row");
    expect(rows[1]).toHaveTextContent("A recognised degree.");
    expect(rows[1]).toHaveTextContent("Education level: bachelor");
    expect(rows[1]).toHaveTextContent("Met");
    expect(rows[2]).toHaveTextContent("Needs: 48,300 EUR");
    expect(rows[2]).toHaveTextContent("Not known yet");
    expect(screen.getByText("How we worked this out")).toBeInTheDocument();
  });

  it("asks the guide and shows the answer with the quotes it rests on", async () => {
    const answering = {
      id: "a1",
      route: "de-blue-card",
      question: "Can my spouse work on this visa?",
      status: "answering",
      answer: "",
      citations: [],
      partial: false,
      created_at: "2026-09-25T10:00:00Z",
      disclaimer: "Information from the official pages, not legal advice.",
    };
    const answered = {
      ...answering,
      status: "answered",
      answer: "Yes. Family members of a Blue Card holder may work in Germany.",
      citations: [
        {
          name: "Make it in Germany",
          url: "https://example.org/blue-card",
          quote: "Your spouse is permitted to work in Germany without restriction.",
        },
      ],
    };
    api.POST.mockImplementation(() => ok(answering, 202));
    renderRoute();
    const base = api.GET.getMockImplementation() as (path: string, options: unknown) => unknown;
    api.GET.mockImplementation((path: string, options: unknown) =>
      path.includes("/guide/answers/") ? ok(answered) : base(path, options),
    );
    fireEvent.click(await screen.findByRole("tab", { name: "Guide" }));
    fireEvent.change(screen.getByLabelText("Your question"), {
      target: { value: "Can my spouse work on this visa?" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Ask" }));
    expect(
      await screen.findByText("Yes. Family members of a Blue Card holder may work in Germany."),
    ).toBeInTheDocument();
    expect(api.POST.mock.calls[0][1].body).toEqual({
      route: "de-blue-card",
      question: "Can my spouse work on this visa?",
    });
    expect(
      screen.getByText("Your spouse is permitted to work in Germany without restriction."),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Make it in Germany/ })).toHaveAttribute(
      "href",
      "https://example.org/blue-card",
    );
  });

  it("adds a gap to the plan under its route's key", async () => {
    api.POST.mockImplementation(() => ok({ id: "t1", key: "added:de-blue-card:offer" }, 201));
    renderRoute();
    fireEvent.click(await screen.findByRole("tab", { name: /Gaps/ }));
    fireEvent.click(await screen.findByRole("button", { name: "Add to plan" }));
    await waitFor(() => expect(api.POST).toHaveBeenCalled());
    const [path, options] = api.POST.mock.calls[0];
    expect(path).toBe("/api/ai/v1/me/plan/todos/");
    expect(options.body).toMatchObject({
      key: "de-blue-card:offer",
      title: "A job offer from an employer in Germany.",
      route: "de-blue-card",
    });
    expect(await screen.findByText("In your plan")).toBeInTheDocument();
  });
});
