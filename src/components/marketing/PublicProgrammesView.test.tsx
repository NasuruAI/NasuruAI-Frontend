import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AnnouncerProvider } from "@/components/ui/Announcer";
import type { PublicProgrammeFilterOptions, PublicProgrammePage } from "@/lib/public-programmes";
import { PublicProgrammesView } from "./PublicProgrammesView";

const { apiFetch, push } = vi.hoisted(() => ({
  apiFetch: vi.fn(),
  push: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/lib/api", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/api")>();
  return { ...original, apiFetch };
});

const filters: PublicProgrammeFilterOptions = {
  countries: [{ code: "CA", name: "Canada", programme_count: 234 }],
  levels: [{ value: "postgraduate", label: "Postgraduate" }],
  school_types: [{ value: "university", label: "University" }],
  currencies: ["CAD"],
};

const programmes: PublicProgrammePage = {
  count: 25,
  next: "https://api.example.test/catalogue/programmes/?page=2",
  previous: null,
  results: [
    {
      id: "programme-1",
      name: "MSc Computer Science",
      level: "postgraduate",
      duration_months: 24,
      tuition_amount: "12000",
      tuition_currency: "CAD",
      language_of_instruction: "English",
      intakes: ["2027-09-01"],
      application_opens: null,
      application_deadline: "2027-05-01",
      school: {
        id: "school-1",
        name: "Example University",
        kind: "university",
        country_name: "Canada",
        country_code: "CA",
        city: "Toronto",
        province: "Ontario",
        website: "https://example.test",
        description: "",
        logo_url: "",
      },
      applyboard: {
        program_level_label: "Master's Degree",
        min_length: 24,
        max_length: 24,
        program_intakes: [{ startDate: "2027-09-01" }],
        tags: ["scholarships_available"],
        application_fee: 100,
        application_enabled: true,
        success_score: { label: "High" },
      },
    },
  ],
};

afterEach(() => {
  vi.resetAllMocks();
});

function renderPage() {
  return render(
    <AnnouncerProvider>
      <PublicProgrammesView />
    </AnnouncerProvider>,
  );
}

describe("PublicProgrammesView", () => {
  it("renders decision-making programme details and pagination", async () => {
    apiFetch.mockImplementation((path: string) =>
      Promise.resolve(path.includes("programme-filters") ? filters : programmes),
    );

    renderPage();

    expect(await screen.findByRole("heading", { name: "MSc Computer Science" })).toBeVisible();
    expect(screen.getByText("Example University")).toBeVisible();
    expect(screen.getByText(/CA\$12,000|CAD\s?12,000/)).toBeVisible();
    expect(screen.getByText(/currency not specified/)).toBeVisible();
    expect(screen.getByText("Scholarships available")).toBeVisible();
    expect(screen.getByText(/May 1, 2027/)).toBeVisible();
    expect(screen.getByText("Sep 2027")).toBeVisible();
    expect(screen.getByText("Page 1 of 2")).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(push).toHaveBeenCalledWith("/ai/programs?page=2", { scroll: false });
  });

  it("applies destination filters to a shareable catalogue URL", async () => {
    apiFetch.mockImplementation((path: string) =>
      Promise.resolve(path.includes("programme-filters") ? filters : programmes),
    );

    renderPage();
    await screen.findByRole("heading", { name: "MSc Computer Science" });
    fireEvent.change(screen.getByLabelText("Destination"), { target: { value: "CA" } });

    await waitFor(() =>
      expect(push).toHaveBeenCalledWith("/ai/programs?country=CA", { scroll: false }),
    );
  });

  it("automatically applies every catalogue filter parameter", async () => {
    apiFetch.mockImplementation((path: string) =>
      Promise.resolve(path.includes("programme-filters") ? filters : programmes),
    );

    renderPage();
    await screen.findByRole("heading", { name: "MSc Computer Science" });
    fireEvent.click(screen.getByText("Tuition, location, duration and intake filters"));

    const changes: [string, string][] = [
      ["Search schools and programmes", "computer science"],
      ["Destination", "CA"],
      ["Study level", "postgraduate"],
      ["School type", "university"],
      ["City", "Toronto"],
      ["Tuition currency", "CAD"],
      ["Minimum tuition", "5000"],
      ["Maximum tuition", "20000"],
      ["Minimum duration (months)", "12"],
      ["Maximum duration (months)", "36"],
      ["Teaching language", "English"],
      ["Intake year", "2027"],
      ["Deadline on or after", "2027-01-01"],
      ["Deadline on or before", "2027-12-31"],
      ["Sort results", "name"],
      ["Results per page", "48"],
    ];

    for (const [label, value] of changes) {
      fireEvent.change(screen.getByLabelText(label), { target: { value } });
    }

    await waitFor(() => expect(push).toHaveBeenCalled());
    const query = new URLSearchParams((push.mock.calls.at(-1)?.[0] as string).split("?")[1]);
    for (const [key, value] of [
      ["q", "computer science"],
      ["country", "CA"],
      ["level", "postgraduate"],
      ["school_type", "university"],
      ["city", "Toronto"],
      ["currency", "CAD"],
      ["tuition_min", "5000"],
      ["tuition_max", "20000"],
      ["duration_min", "12"],
      ["duration_max", "36"],
      ["language", "English"],
      ["intake_year", "2027"],
      ["deadline_after", "2027-01-01"],
      ["deadline_before", "2027-12-31"],
      ["ordering", "name"],
      ["page_size", "48"],
    ]) {
      expect(query.get(key)).toBe(value);
    }
    expect(query.get("page") ?? "1").toBe("1");
  });
});
