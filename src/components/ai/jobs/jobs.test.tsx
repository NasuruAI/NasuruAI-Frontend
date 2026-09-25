import { QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AnnouncerProvider } from "@/components/ui/Announcer";
import { ai } from "@/lib/ai/client";
import {
  checkRows,
  DEFAULT_FILTERS,
  daysSince,
  type Job,
  type JobCheck,
  jobQuery,
  type OfferCheck,
  reportRoutes,
  salaryRange,
} from "@/lib/ai/jobs";
import { makeQueryClient } from "@/lib/ai/QueryProvider";
import { ToastProvider } from "../Toast";
import { offerChecks } from "./CheckOfferView";
import { JobsView } from "./JobsView";
import { ReportDialog, SalaryText } from "./parts";

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
      jobQuery({ q: " data ", remote: true, include_caution: true, sort: "recent" }, 3),
    ).toEqual({
      sort: "recent",
      q: "data",
      remote: true,
      include_caution: true,
      page: 3,
    });
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

describe("JobsView", () => {
  it("moves with j and k, saves with s, and focuses search with /", async () => {
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
      return ok({ rate: "1700", as_of: "2026-09-24", source_name: "CBN" });
    });
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
