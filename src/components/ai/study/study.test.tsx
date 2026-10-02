import { QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AnnouncerProvider } from "@/components/ui/Announcer";
import { ai } from "@/lib/ai/client";
import { makeQueryClient } from "@/lib/ai/QueryProvider";
import {
  DEFAULT_STUDY_FILTERS,
  filterChips,
  programmeCostLines,
  type ProgrammeDetail,
  type ProgrammeResult,
  scholarshipValueText,
} from "@/lib/ai/study";
import { ToastProvider } from "../Toast";
import { DeadlinesView } from "./DeadlinesView";
import { ProgrammeDetailView } from "./ProgrammeDetailView";
import { ProgrammeSearchView } from "./ProgrammeSearchView";
import { ScholarshipDetailView } from "./ScholarshipDetailView";
import { ScholarshipsView } from "./ScholarshipsView";

vi.mock("@/lib/ai/client", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/ai/client")>();
  return { ...original, ai: { GET: vi.fn(), POST: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() } };
});

const api = ai as unknown as Record<"GET" | "POST" | "PATCH" | "DELETE", ReturnType<typeof vi.fn>>;
const ok = (data: unknown, status = 200) =>
  Promise.resolve({ data, response: new Response(null, { status }) });

afterEach(() => vi.resetAllMocks());

function wrap(children: React.ReactNode) {
  return (
    <QueryClientProvider client={makeQueryClient()}>
      <AnnouncerProvider>
        <ToastProvider>{children}</ToastProvider>
      </AnnouncerProvider>
    </QueryClientProvider>
  );
}

function programme(id: string, patch: Partial<ProgrammeResult> = {}): ProgrammeResult {
  return {
    id,
    name: `MSc Data Science ${id}`,
    level: "master",
    subject: "Data Science",
    language: "en",
    duration_months: 12,
    url: "https://uni.example/apply",
    institution: { id: "inst-1", name: "Example University", city: "London", country: "GB" },
    admissibility: "admissible",
    cost: {
      lines: [
        {
          label: "Tuition",
          amount: "20000",
          currency: "GBP",
          per: "year",
          total: "20000",
          ngn: "40000000",
          rate: null,
          source_name: "Example University",
          source_url: "https://uni.example",
          verified_at: "2026-01-01",
          stale: false,
        },
      ],
      proof_of_funds: [],
      spend_ngn: "40000000",
      after_scholarships_ngn: "40000000",
      automatic_scholarship_ngn: "0",
      competitive_scholarships: [],
      proof_of_funds_ngn: "0",
      complete: true,
      missing: [],
    },
    flags: {
      post_study_work: true,
      pgwp_eligible: null,
      licensed_student_sponsor: true,
      designated_learning_institution: null,
      shortage_subject: false,
    },
    next_intake: { starts_on: "2027-09-20", deadline: "2027-06-30", note: "" },
    scholarships: [],
    source: {
      name: "Example data",
      url: "https://uni.example",
      verified_at: "2026-01-01T00:00:00Z",
      stale: false,
    },
    ...patch,
  };
}

function programmeDetail(id: string, patch: Partial<ProgrammeDetail> = {}): ProgrammeDetail {
  return {
    ...programme(id),
    admissibility_checks: [
      {
        kind: "uk_class",
        requirement: "Upper second or equivalent",
        outcome: "pass",
        detail: "Your 2:1 meets this.",
      },
    ],
    intakes: [
      {
        id: "intake-1",
        programme: id,
        starts_on: "2027-09-20",
        deadline: "2027-06-30",
        deadline_note: "",
      },
    ],
    ...patch,
  };
}

describe("study helpers", () => {
  it("builds one chip per active filter, with what clears it", () => {
    const chips = filterChips({
      ...DEFAULT_STUDY_FILTERS,
      subject: "Data Science",
      postStudyWork: true,
      tuitionMax: 50_000_000,
    });
    expect(chips.map((chip) => chip.label)).toEqual([
      "Data Science",
      "Leads to post-study work",
      "Under ₦50,000,000",
    ]);
    expect(chips.find((chip) => chip.key === "psw")?.clear).toEqual({ postStudyWork: false });
  });

  it("formats a scholarship's value from whichever field is set", () => {
    expect(scholarshipValueText({ value_text: "Full tuition + stipend" })).toBe(
      "Full tuition + stipend",
    );
    expect(scholarshipValueText({ covers_full_tuition: true })).toBe("Full tuition");
    expect(scholarshipValueText({ value_amount: "1200", value_currency: "GBP" })).toBe("£1,200");
    expect(scholarshipValueText({})).toBe("Amount not stated");
  });

  it("turns a programme's cost into CostBreakdown lines, leaving out unconverted ones", () => {
    const lines = programmeCostLines({
      lines: [
        {
          label: "Tuition",
          amount: "20000",
          currency: "GBP",
          per: "year",
          total: "20000",
          ngn: "40000000",
          rate: null,
          source_name: "Uni",
          source_url: "https://uni.example",
          verified_at: null,
          stale: false,
        },
        {
          label: "Unpriced extra",
          amount: "0",
          currency: "GBP",
          per: "",
          total: "0",
          ngn: null,
          rate: null,
          source_name: null,
          source_url: null,
          verified_at: null,
          stale: false,
        },
      ],
      proof_of_funds: [
        {
          label: "Blocked account",
          amount: "11904",
          currency: "EUR",
          per: "once",
          total: "11904",
          ngn: "20236800",
          rate: null,
          source_name: null,
          source_url: null,
          verified_at: null,
          stale: false,
        },
      ],
      spend_ngn: "40000000",
      after_scholarships_ngn: "40000000",
      automatic_scholarship_ngn: "0",
      competitive_scholarships: [],
      proof_of_funds_ngn: "20236800",
      complete: false,
      missing: ["no exchange rate for Unpriced extra"],
    });
    expect(lines.map((line) => line.label)).toEqual(["Tuition", "Blocked account"]);
    expect(lines[0].kind).toBe("tuition");
    expect(lines[1].kind).toBe("proof_of_funds");
  });
});

describe("ProgrammeSearchView", () => {
  it("shows your grade, the results, and includes not-admissible ones when asked", async () => {
    api.GET.mockImplementation((path: string) => {
      if (path === "/api/ai/v1/me/") return ok({ destination: "GB" });
      if (path === "/api/ai/v1/me/grade/") {
        return ok({
          degree: {},
          converted: {
            as_written: "4.21/5.00",
            uk_class: "2:1",
            uk_class_label: "Upper second",
            german_grade: "1.6",
            cgpa: null,
            scale: null,
            working: "1 + 3 × …",
            indicative: true,
          },
        });
      }
      return ok({
        country: "GB",
        count: 1,
        page: 1,
        page_size: 25,
        results: [programme("a")],
        not_shown: { not_admissible: 1 },
        your_grade: null,
      });
    });
    render(wrap(<ProgrammeSearchView />));
    expect(await screen.findByText("MSc Data Science a")).toBeInTheDocument();
    expect(screen.getByText(/converts to Upper second/)).toBeInTheDocument();
    expect(screen.getByText(/1 hidden \(not admissible\)/)).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("switch", { name: /Include programmes you're not admissible/ }),
    );
    await waitFor(() =>
      expect(
        api.GET.mock.calls.some(
          ([path, options]) =>
            path === "/api/ai/v1/study/programmes/" &&
            options?.params?.query?.include_not_admissible === true,
        ),
      ).toBe(true),
    );
  });
});

describe("ProgrammeDetailView", () => {
  function detailApi(detail: ProgrammeDetail) {
    api.GET.mockImplementation((path: string) => {
      if (path === "/api/ai/v1/study/programmes/{programme_id}/") return ok(detail);
      if (path === "/api/ai/v1/me/applications/") return ok({ columns: [] });
      if (path === "/api/ai/v1/handoff/disclosure/") {
        return ok({ version: "v1", text: "We'll only contact you about what you send us." });
      }
      return ok({});
    });
  }

  it("shows admissibility checks and adds the programme to the board", async () => {
    detailApi(programmeDetail("p1"));
    api.POST.mockImplementation(() => ok({ id: "card-1" }, 201));
    render(wrap(<ProgrammeDetailView id="p1" />));
    expect(await screen.findByText("MSc Data Science p1")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Can I get in?" }));
    expect(await screen.findByText("UK class: Upper second or equivalent")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Add to board" }));
    await waitFor(() => expect(api.POST).toHaveBeenCalled());
    expect(api.POST.mock.calls[0][0]).toBe("/api/ai/v1/me/applications/");
    expect(api.POST.mock.calls[0][1].body).toEqual({ programme: "p1", intake: "intake-1" });
  });

  it("only sends the handoff request once the disclosure is agreed to", async () => {
    detailApi(programmeDetail("p1"));
    api.POST.mockImplementation(() => ok({ id: "h1", status: "requested" }, 201));
    render(wrap(<ProgrammeDetailView id="p1" />));
    await screen.findByText("MSc Data Science p1");

    fireEvent.click(screen.getAllByRole("button", { name: "Want a person to handle this?" })[0]);
    await screen.findByText(/We'll only contact you/);
    const send = screen.getByRole("button", { name: "Send to the agency" });
    fireEvent.click(send);
    expect(api.POST).not.toHaveBeenCalled();
    expect(screen.getByText("Read and agree to the disclosure first.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(send);
    await waitFor(() => expect(api.POST).toHaveBeenCalled());
    expect(api.POST.mock.calls[0][1].body).toMatchObject({ consent: true, programme_ids: ["p1"] });
  });
});

describe("ScholarshipsView and ScholarshipDetailView", () => {
  it("lists scholarships with their value and deadline", async () => {
    api.GET.mockImplementation((path: string) => {
      if (path === "/api/ai/v1/me/") return ok({ destination: "GB" });
      if (path === "/api/ai/v1/study/scholarships/") {
        return ok([
          {
            id: "s1",
            name: "Chevening Scholarships",
            provider: "FCDO",
            covers_full_tuition: true,
            return_home_required: true,
            awards_count: 50,
          },
        ]);
      }
      return ok({});
    });
    render(wrap(<ScholarshipsView />));
    expect(await screen.findByText("Chevening Scholarships")).toBeInTheDocument();
    expect(screen.getByText("Full tuition")).toBeInTheDocument();
    expect(screen.getByText("You must return home after")).toBeInTheDocument();
  });

  it("explains why a scholarship is or isn't a fit", async () => {
    api.GET.mockImplementation((path: string) => {
      if (path === "/api/ai/v1/study/scholarships/{scholarship_id}/") {
        return ok({
          id: "s1",
          name: "For Nigerians",
          provider: "P",
          value_text: "₦500,000",
          status: "not_eligible",
          checks: [
            { kind: "nationality", outcome: "pass", detail: "Your nationality is eligible." },
            { kind: "deadline", outcome: "fail", detail: "The deadline has passed." },
          ],
        });
      }
      return ok({});
    });
    render(wrap(<ScholarshipDetailView id="s1" />));
    expect(await screen.findByText("For Nigerians")).toBeInTheDocument();
    expect(screen.getByText("Not eligible yet")).toBeInTheDocument();
    expect(screen.getByText("The deadline has passed.")).toBeInTheDocument();
  });
});

describe("DeadlinesView", () => {
  it("lists deadlines soonest first and downloads the calendar feed", async () => {
    api.GET.mockImplementation((path: string) => {
      if (path === "/api/ai/v1/me/deadlines/") {
        return ok({
          results: [
            {
              id: "c1",
              type: "application",
              kind: "programme",
              title: "MSc Data Science",
              organisation: "Example University",
              country: "GB",
              state: "saved",
              date: "2027-06-30",
              note: "",
            },
          ],
        });
      }
      if (path === "/api/ai/v1/me/deadlines/ics/") {
        return ok(new Blob(["BEGIN:VCALENDAR"]), 200);
      }
      return ok({});
    });
    (URL as unknown as { createObjectURL: () => string }).createObjectURL = vi.fn(
      () => "blob:mock",
    );
    (URL as unknown as { revokeObjectURL: () => void }).revokeObjectURL = vi.fn();

    render(wrap(<DeadlinesView />));
    expect(await screen.findByText("Example University")).toBeInTheDocument();
    expect(screen.getByText("MSc Data Science")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Add to calendar" }));
    await waitFor(() =>
      expect(api.GET.mock.calls.some(([path]) => path === "/api/ai/v1/me/deadlines/ics/")).toBe(
        true,
      ),
    );
  });
});
