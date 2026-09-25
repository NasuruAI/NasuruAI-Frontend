import { QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AnnouncerProvider } from "@/components/ui/Announcer";
import { ai } from "@/lib/ai/client";
import {
  checkRows,
  DEFAULT_FILTERS,
  daysSince,
  filterChips,
  filtersFromSearch,
  type Job,
  type JobCheck,
  jobQuery,
  type OfferCheck,
  reportRoutes,
  salaryRange,
  searchFromFilters,
} from "@/lib/ai/jobs";
import { makeQueryClient } from "@/lib/ai/QueryProvider";
import { ToastProvider } from "../Toast";
import { CheckResult, guideCountry, offerChecks, SponsorshipGuide } from "./CheckOfferView";
import { JobsView } from "./JobsView";
import { FitBreakdown, ReportDialog, SalaryText } from "./parts";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/ai/jobs",
}));

vi.mock("@/lib/ai/client", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/ai/client")>();
  return { ...original, ai: { GET: vi.fn(), POST: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() } };
});

const api = ai as unknown as Record<"GET" | "POST" | "PATCH" | "DELETE", ReturnType<typeof vi.fn>>;
const ok = (data: unknown, status = 200) =>
  Promise.resolve({ data, response: new Response(null, { status }) });

afterEach(() => vi.resetAllMocks());

const job = (id: string, patch: Partial<Job> = {}): Job => ({
  id,
  title: `Data analyst ${id}`,
  employer: `Employer ${id}`,
  country: "DE",
  location_text: "Berlin",
  remote: false,
  employment_type: "full_time",
  apply_url: "https://example.org/apply",
  salary_min: "48000",
  salary_max: "56000",
  salary_currency: "EUR",
  salary_period: "year",
  salary_is_estimate: false,
  posted_at: "2026-09-22T10:00:00Z",
  trust_score: 85,
  trust_band: "high",
  checked_at: "2026-09-23T10:00:00Z",
  fit: { score: 78, reasons: ["Your title matches", "4 of 6 skills"] },
  saved: false,
  ...patch,
});

function wrap(children: React.ReactNode) {
  return (
    <QueryClientProvider client={makeQueryClient()}>
      <AnnouncerProvider>
        <ToastProvider>{children}</ToastProvider>
      </AnnouncerProvider>
    </QueryClientProvider>
  );
}

describe("job helpers", () => {
  it("sends only the filters that differ from the defaults", () => {
    expect(jobQuery(DEFAULT_FILTERS, 1)).toEqual({ sort: "fit" });
    expect(
      jobQuery(
        { ...DEFAULT_FILTERS, q: " data ", remote: true, include_caution: true, sort: "recent" },
        3,
      ),
    ).toEqual({
      sort: "recent",
      q: "data",
      remote: true,
      include_caution: true,
      page: 3,
    });
    expect(
      jobQuery(
        {
          ...DEFAULT_FILTERS,
          cities: ["Leeds", "Manchester"],
          route: "gb-skilled-worker",
          meets_salary_threshold: true,
          language: "english",
          posted_within: 7,
          sponsor: "register",
        },
        1,
      ),
    ).toEqual({
      sort: "fit",
      city: ["Leeds", "Manchester"],
      route: "gb-skilled-worker",
      meets_salary_threshold: true,
      language: "english",
      posted_within: 7,
      sponsor: "register",
    });
  });

  it("puts filters into words, each with what removing it resets", () => {
    const chips = filterChips(
      {
        ...DEFAULT_FILTERS,
        q: "analyst",
        cities: ["Leeds", "York"],
        route: "gb-skilled-worker",
        language: "english",
        posted_within: 7,
        sponsor: "confirmed",
      },
      { "gb-skilled-worker": "Skilled Worker visa" },
    );
    expect(chips.map((chip) => chip.label)).toEqual([
      "“analyst”",
      "Leeds",
      "York",
      "Fits the Skilled Worker visa",
      "English-speaking",
      "Last week",
      "Sponsor check passed",
    ]);
    expect(chips.find((chip) => chip.label === "Leeds")?.clear).toEqual({ cities: ["York"] });
    expect(filterChips(DEFAULT_FILTERS)).toEqual([]);
  });

  it("keeps a search's filters, not its sort, and opens it again", () => {
    const filters = {
      ...DEFAULT_FILTERS,
      q: " nurse ",
      sort: "recent" as const,
      include_caution: true,
      cities: ["Leeds"],
      posted_within: 3,
    };
    const saved = searchFromFilters(filters);
    expect(saved).toEqual({
      q: "nurse",
      remote: false,
      cities: ["Leeds"],
      route: "",
      meets_salary_threshold: false,
      language: "any",
      posted_within: 3,
      sponsor: "any",
    });
    expect(filtersFromSearch({ filters: saved } as never)).toEqual({
      ...DEFAULT_FILTERS,
      q: "nurse",
      cities: ["Leeds"],
      posted_within: 3,
    });
  });

  it("picks the guide's country from the offer, then the destination", () => {
    expect(guideCountry("DE", "GB")).toBe("DE");
    expect(guideCountry("FR", "GB")).toBe("GB");
    expect(guideCountry(undefined, null)).toBe("GB");
  });

  it("reads salary ranges, single figures and missing ones", () => {
    expect(salaryRange(job("a"))).toEqual({ min: 48000, max: 56000 });
    expect(salaryRange(job("a", { salary_max: null }))).toEqual({ min: 48000, max: 48000 });
    expect(salaryRange(job("a", { salary_min: null, salary_max: null }))).toBeNull();
    expect(salaryRange(job("a", { salary_currency: "" }))).toBeNull();
  });

  it("counts days since posting by calendar day", () => {
    expect(daysSince("2026-09-22T23:00:00", new Date(2026, 8, 25, 1, 0))).toBe(3);
    expect(daysSince("2026-09-25T08:00:00", new Date(2026, 8, 25, 20, 0))).toBe(0);
  });

  it("maps trust checks and offer checks to CheckList rows", () => {
    const checks = [
      {
        check: "can_sponsor",
        label: "Employer can sponsor",
        outcome: "pass",
        points: 30,
        max_points: 30,
        evidence: "On the register",
        source_url: "https://example.org/register",
        checked_at: "",
      },
    ] as JobCheck[];
    expect(checkRows(checks)).toEqual([
      {
        name: "Employer can sponsor",
        outcome: "pass",
        evidence: "On the register",
        source: { name: "Evidence", url: "https://example.org/register" },
      },
    ]);
    const offer = {
      checks: [
        {
          check: "fee_requested",
          label: "No payment asked of you",
          outcome: "fail",
          evidence: "Asks for £450",
        },
      ],
    } as unknown as OfferCheck;
    expect(offerChecks(offer)[0]).toMatchObject({
      name: "No payment asked of you",
      outcome: "fail",
    });
  });

  it("takes report routes only from sourced facts", () => {
    expect(
      reportRoutes([
        { action: "report_to_us", label: "Report it to Nasuru" },
        {
          action: "report_efcc",
          label: "EFCC fraud line",
          value: "0800 000 0000",
          source_url: "https://efcc.gov.ng",
        },
        { action: "report_naptip", label: "NAPTIP" },
        { action: "stop_contact", label: "Block the sender" },
      ]),
    ).toEqual([{ label: "EFCC fraud line", href: "https://efcc.gov.ng", detail: "0800 000 0000" }]);
  });
});

describe("SalaryText", () => {
  it("puts naira first once the rate is known, with the job's own figures after", async () => {
    api.GET.mockImplementation(() => ok({ rate: "1700", as_of: "2026-09-24", source_name: "CBN" }));
    render(wrap(<SalaryText job={job("a")} showRate />));
    expect(await screen.findByText("₦81.6m–₦95.2m")).toBeInTheDocument();
    expect(screen.getByText(/€48,000–€56,000/)).toBeInTheDocument();
    expect(screen.getByText(/to 1 EUR/)).toBeInTheDocument();
  });

  it("falls back to the job's currency without a rate, and says when there's no salary", async () => {
    api.GET.mockImplementation(() =>
      Promise.resolve({
        data: undefined,
        error: { code: "no_rate" },
        response: new Response(null, { status: 404 }),
      }),
    );
    const { rerender } = render(wrap(<SalaryText job={job("a", { salary_max: null })} />));
    expect(await screen.findByText("€48,000")).toBeInTheDocument();
    rerender(wrap(<SalaryText job={job("a", { salary_min: null, salary_max: null })} />));
    expect(screen.getByText("Salary not given")).toBeInTheDocument();
  });
});

function jobsApi() {
  api.GET.mockImplementation((path: string) => {
    if (path === "/api/ai/v1/jobs/") {
      return ok({
        country: "DE",
        count: 2,
        page: 1,
        page_size: 25,
        results: [job("a"), job("b")],
        not_shown: { failed_verification: 3, caution: 0, being_checked: 0, needs_german: 1 },
        explanation: "Not shown: 3 failed our checks; 1 need German at B2 or above.",
      });
    }
    if (path === "/api/ai/v1/me/") return ok({ destination: "DE" });
    if (path === "/api/ai/v1/routes/") {
      return ok([
        { id: "r1", code: "de-blue-card", country: "DE", name: "EU Blue Card", family: "work" },
        { id: "r2", code: "de-study", country: "DE", name: "Student visa", family: "study" },
      ]);
    }
    if (path === "/api/ai/v1/me/job-searches/") return ok([]);
    return ok({ rate: "1700", as_of: "2026-09-24", source_name: "CBN" });
  });
}

describe("JobsView", () => {
  it("sends the extra filters and shows each as a removable chip", async () => {
    jobsApi();
    render(wrap(<JobsView />));
    await screen.findByText("Data analyst a");
    fireEvent.click(screen.getByRole("button", { name: "More filters" }));
    fireEvent.click(screen.getByRole("switch", { name: /English-speaking jobs only/ }));
    await waitFor(() =>
      expect(
        api.GET.mock.calls.some(
          ([path, options]) =>
            path === "/api/ai/v1/jobs/" && options?.params?.query?.language === "english",
        ),
      ).toBe(true),
    );
    // Work routes only.
    const route = await screen.findByRole("combobox", { name: /Visa route/ });
    await waitFor(() => expect(route.querySelectorAll("option")).toHaveLength(2));
    fireEvent.change(route, { target: { value: "de-blue-card" } });
    expect(await screen.findByText("Fits the EU Blue Card")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Remove English-speaking" }));
    expect(screen.getByRole("switch", { name: /English-speaking jobs only/ })).toHaveAttribute(
      "aria-checked",
      "false",
    );
  });

  it("saves the search with its filters and alerts on", async () => {
    jobsApi();
    api.POST.mockImplementation(() => ok({ id: "s1" }, 201));
    render(wrap(<JobsView />));
    await screen.findByText("Data analyst a");
    fireEvent.click(screen.getByRole("button", { name: "More filters" }));
    fireEvent.click(screen.getByRole("switch", { name: /Meets the visa salary threshold/ }));
    fireEvent.click(screen.getByRole("button", { name: "Save this search" }));
    const name = await screen.findByLabelText("Name");
    fireEvent.change(name, { target: { value: "Well paid" } });
    fireEvent.click(screen.getByRole("button", { name: "Save search" }));
    await waitFor(() => expect(api.POST).toHaveBeenCalled());
    const [path, options] = api.POST.mock.calls[0];
    expect(path).toBe("/api/ai/v1/me/job-searches/");
    expect(options.body).toMatchObject({
      name: "Well paid",
      alerts: true,
      filters: { meets_salary_threshold: true, language: "any" },
    });
  });

  it("moves with j and k, saves with s, and focuses search with /", async () => {
    jobsApi();
    api.POST.mockImplementation(() => ok({ saved: true }, 201));
    render(wrap(<JobsView />));

    await screen.findByText("Data analyst a");
    expect(screen.getByRole("status")).toHaveTextContent("3 failed our checks");
    // The job rows only: each card has its own nested list of fit reasons.
    const items = [...screen.getByRole("list", { name: "Jobs" }).children];
    expect(items[0]).toHaveAttribute("aria-current", "true");

    act(() => {
      fireEvent.keyDown(window, { key: "j" });
    });
    expect(items[1]).toHaveAttribute("aria-current", "true");

    act(() => {
      fireEvent.keyDown(window, { key: "s" });
    });
    await waitFor(() => expect(api.POST).toHaveBeenCalled());
    expect(api.POST.mock.calls[0][0]).toBe("/api/ai/v1/jobs/{job_id}/save/");
    expect(api.POST.mock.calls[0][1].params.path.job_id).toBe("b");

    act(() => {
      fireEvent.keyDown(window, { key: "/" });
    });
    expect(screen.getByRole("searchbox")).toHaveFocus();
  });
});

describe("ReportDialog", () => {
  it("reports anonymously by default", () => {
    const onSubmit = vi.fn();
    render(
      wrap(
        <ReportDialog
          open
          what="this job"
          onClose={() => undefined}
          onSubmit={onSubmit}
          pending={false}
          done={false}
          error={null}
        />,
      ),
    );
    fireEvent.change(screen.getByLabelText(/What happened/), {
      target: { value: " Asked for a fee " },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send report" }));
    expect(onSubmit).toHaveBeenCalledWith({
      details: "Asked for a fee",
      anonymous: true,
      consent_to_publish: false,
    });
  });
});

describe("FitBreakdown", () => {
  it("shows each factor against its weight, and the must-haves", () => {
    render(
      wrap(
        <FitBreakdown
          fit={{
            score: 64,
            reasons: [],
            factors: [
              { key: "title", label: "Your experience", points: 45, max: 45, detail: "Close" },
              { key: "skills", label: "Your skills", points: 12, max: 40, detail: "2 of 6" },
              { key: "salary", label: "Salary", points: 7, max: 15, detail: "Not known" },
            ],
            hard_filters: [
              { key: "german", label: "German at B2 or above", passed: true, detail: "Shown" },
            ],
          }}
        />,
      ),
    );
    expect(screen.getByText("12 / 40")).toBeInTheDocument();
    expect(screen.getByText("Must-haves")).toBeInTheDocument();
    expect(screen.getByText(": met")).toBeInTheDocument();
  });

  it("falls back to the reasons when there's no breakdown", () => {
    render(wrap(<FitBreakdown fit={{ score: 70, reasons: ["Your title matches"] }} />));
    expect(screen.getByText("Your title matches")).toBeInTheDocument();
  });
});

const genuine = {
  id: "c1",
  status: "done",
  verdict: "genuine",
  verdict_label: "Looks genuine",
  checks: [],
  extracted: { company_name: "Acme Ltd", company_country: "GB" },
  next_steps: [{ action: "save_to_documents", label: "Save the offer to your documents" }],
  saved_document: null,
} as unknown as OfferCheck;

const ukGuide = {
  country: "GB",
  country_name: "United Kingdom",
  steps_written: true,
  route: "Skilled Worker visa",
  checked_on: "2026-09-25",
  steps: [
    {
      title: "They assign you a certificate of sponsorship",
      detail: "It's an electronic record, not a physical document.",
      sources: [
        { name: "GOV.UK: your job", url: "https://www.gov.uk/skilled-worker-visa/your-job" },
      ],
    },
  ],
  red_flags: ["You're asked to pay for the certificate."],
  rules: ["Never pay an employer or a recruiter for a job."],
};

describe("The offer checker", () => {
  it("saves a genuine offer to your documents", async () => {
    api.GET.mockImplementation((path: string) =>
      path === "/api/ai/v1/guide/job-offer/" ? ok(ukGuide) : ok({ destination: "GB" }),
    );
    api.POST.mockImplementation(() => ok({ id: "d1" }, 201));
    render(wrap(<CheckResult check={genuine} onAgain={() => undefined} />));
    fireEvent.click(screen.getByRole("button", { name: "Save to your documents" }));
    await waitFor(() => expect(api.POST).toHaveBeenCalled());
    const [path, options] = api.POST.mock.calls[0];
    expect(path).toBe("/api/ai/v1/checks/offers/{check_id}/save/");
    expect(options.params.path.check_id).toBe("c1");
    expect(options.body).toEqual({ keep_anyway: false });
    // The save step is the button, not a line of text too.
    expect(screen.queryByText("Save the offer to your documents")).not.toBeInTheDocument();
  });

  it("links to the saved copy once it's kept", () => {
    api.GET.mockImplementation(() => ok({ destination: "GB" }));
    render(
      wrap(<CheckResult check={{ ...genuine, saved_document: "d1" }} onAgain={() => undefined} />),
    );
    expect(screen.getByRole("link", { name: "In your documents" })).toHaveAttribute(
      "href",
      "/ai/documents",
    );
  });

  it("shows the official steps with their sources", async () => {
    api.GET.mockImplementation(() => ok(ukGuide));
    render(wrap(<SponsorshipGuide country="GB" />));
    fireEvent.click(await screen.findByRole("button", { name: "Show the steps" }));
    expect(screen.getByText(/electronic record/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /GOV.UK: your job/ })).toHaveAttribute(
      "href",
      "https://www.gov.uk/skilled-worker-visa/your-job",
    );
    expect(screen.getByText(/checked 25 Sep/)).toBeInTheDocument();
  });

  it("says when a country's steps aren't written yet", async () => {
    api.GET.mockImplementation(() =>
      ok({
        ...ukGuide,
        country: "DE",
        country_name: "Germany",
        steps_written: false,
        route: "",
        checked_on: null,
        steps: [],
        red_flags: [],
      }),
    );
    render(wrap(<SponsorshipGuide country="DE" startOpen />));
    expect(
      await screen.findByText(/haven't written the steps for Germany yet/),
    ).toBeInTheDocument();
    expect(screen.getByText("Never pay an employer or a recruiter for a job.")).toBeInTheDocument();
  });
});
