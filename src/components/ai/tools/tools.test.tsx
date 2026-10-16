import { QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ai } from "@/lib/ai/client";
import { makeQueryClient } from "@/lib/ai/QueryProvider";
import { POINTS_TOOLS } from "@/lib/ai/tools";
import { EligibilityToolView } from "./EligibilityToolView";
import { GradeToolView } from "./GradeToolView";
import { PointsToolView } from "./PointsToolView";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/ai/tools",
}));

vi.mock("@/lib/ai/client", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/ai/client")>();
  return { ...original, ai: { GET: vi.fn(), POST: vi.fn() } };
});

const api = ai as unknown as Record<"GET" | "POST", ReturnType<typeof vi.fn>>;
const ok = (data: unknown, status = 200) =>
  Promise.resolve({ data, response: new Response(null, { status }) });

afterEach(() => vi.resetAllMocks());

function wrap(children: React.ReactNode) {
  return <QueryClientProvider client={makeQueryClient()}>{children}</QueryClientProvider>;
}

describe("PointsToolView", () => {
  it("posts typed inputs and shows the score with its source", async () => {
    api.POST.mockImplementation(() =>
      ok({
        scheme: "gb_skilled_worker",
        total: 50,
        threshold: 70,
        meets_threshold: false,
        lines: [
          { factor: "Job offer", points: 20, maximum: 20, basis: "" },
          { factor: "Skill level", points: 20, maximum: 20, basis: "" },
          { factor: "English", points: 10, maximum: 10, basis: "" },
        ],
        assumptions: [],
        what_ifs: [{ change: "Earn more", gain: 20, overrides: {} }],
        source_name: "GOV.UK",
        source_url: "https://www.gov.uk/skilled-worker-visa",
        is_stale: false,
        inputs: {},
        reference: null,
      }),
    );
    render(wrap(<PointsToolView tool={POINTS_TOOLS["uk-points"]} />));
    fireEvent.click(screen.getByRole("button", { name: "Calculate my score" }));
    expect(await screen.findByText("50")).toBeInTheDocument();
    expect(screen.getByText(/20 below the pass mark/)).toBeInTheDocument();
    expect(screen.getByText(/Earn more/)).toBeInTheDocument();
  });
});

describe("GradeToolView", () => {
  it("converts a typed grade and shows the working", async () => {
    api.POST.mockImplementation(() =>
      ok({
        as_written: "4.2 / 5.0",
        uk_class: "2:1",
        uk_class_label: "Upper second (2:1)",
        german_grade: "1.6",
        cgpa: "4.2",
        scale: "5.0",
        working: "German grade = 1.6",
        indicative: true,
      }),
    );
    render(wrap(<GradeToolView />));
    fireEvent.change(screen.getByLabelText("Your degree result"), {
      target: { value: "4.2 / 5.0" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Convert my grade" }));
    expect(await screen.findByText("Upper second (2:1)")).toBeInTheDocument();
    expect(screen.getByText(/Indicative only/)).toBeInTheDocument();
  });
});

describe("EligibilityToolView", () => {
  it("shows routes with the blocked answer first", async () => {
    api.POST.mockImplementation(() =>
      ok({
        country: "DE",
        ruleset_version: 2,
        profile_version: 0,
        results: [
          {
            route: {
              code: "de-blue-card",
              country: "DE",
              name: "EU Blue Card",
              typical_months_to_arrival: 5,
            },
            status: "eligible_if",
            gaps: [
              {
                key: "job_offer",
                text: "A job offer from an employer in Germany.",
                alternatives: [],
                unknown: true,
              },
            ],
            reasons: ["A university degree"],
            uses_stale_rules: true,
            computed_at: "2026-10-16T00:00:00Z",
          },
        ],
      }),
    );
    render(wrap(<EligibilityToolView />));
    fireEvent.change(screen.getByLabelText("Where do you want to go?"), {
      target: { value: "DE" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Check my routes" }));
    expect(await screen.findByText("EU Blue Card")).toBeInTheDocument();
    expect(screen.getByText("A job offer from an employer in Germany.")).toBeInTheDocument();
  });
});
