import { QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AnnouncerProvider } from "@/components/ui/Announcer";
import { ai } from "@/lib/ai/client";
import { makeQueryClient } from "@/lib/ai/QueryProvider";
import { ToastProvider } from "../Toast";
import { DocumentsView } from "../documents/DocumentsView";
import { ReferralsView } from "../referrals/ReferralsView";
import { ApplicationDetailView } from "./ApplicationDetailView";
import { MyApplicationsView } from "./MyApplicationsView";
import { NewApplicationView } from "./NewApplicationView";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/ai/my-application",
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/lib/ai/client", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/ai/client")>();
  return { ...original, ai: { GET: vi.fn(), POST: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() } };
});

// The /ai/my-application/new picker now reads the shared programme catalogue.
vi.mock("@/lib/public-programmes", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/public-programmes")>();
  return {
    ...original,
    fetchPublicProgrammeFilterOptions: vi.fn(async () => ({
      countries: [],
      levels: [],
      school_types: [],
      currencies: [],
    })),
    fetchPublicProgrammes: vi.fn(async () => ({
      count: 1,
      next: null,
      previous: null,
      results: [
        {
          id: "p1",
          name: "MSc Data Science",
          level: "postgraduate",
          duration_months: 24,
          tuition_amount: "12000",
          tuition_currency: "EUR",
          language_of_instruction: "English",
          intakes: ["2027-10-01"],
          application_opens: null,
          application_deadline: null,
          school: {
            id: "s1",
            name: "Example University",
            kind: "",
            country_name: "Germany",
            country_code: "DEU",
            city: "Berlin",
            province: "Berlin",
            website: "",
            description: "",
            logo_url: "https://example.test/logo.png",
          },
          applyboard: {
            program_level_label: "Master's Degree",
            min_length: 24,
            max_length: 24,
            application_fee: 100,
            program_intakes: [{ startDate: "2027-10-01" }],
            tags: ["scholarships_available"],
            success_score: { label: "High" },
            application_enabled: true,
          },
        },
      ],
    })),
  };
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

describe("MyApplicationsView", () => {
  it("lists applications with their checklist progress", async () => {
    api.GET.mockImplementation((path: string) => {
      if (path === "/api/applications/") {
        return ok({
          count: 1,
          next: null,
          previous: null,
          results: [
            {
              id: "a1",
              school: "s1",
              school_name: "Example University",
              programme: "p1",
              programme_name: "MSc Data Science",
              intake: "October 2027",
              status: "preparing",
              status_display: "Preparing documents",
              target_submission_date: null,
              checklist: {
                percent_complete: 50,
                percent_uploaded: 60,
                required_count: 10,
                verified_count: 5,
              },
            },
          ],
        });
      }
      return ok({});
    });
    render(wrap(<MyApplicationsView />));
    expect(await screen.findByText("Example University")).toBeInTheDocument();
    expect(screen.getByText(/MSc Data Science/)).toBeInTheDocument();
    expect(screen.getByText(/5 of 10 required documents verified/)).toBeInTheDocument();
  });

  it("shows an empty state with no applications", async () => {
    api.GET.mockImplementation(() => ok({ count: 0, next: null, previous: null, results: [] }));
    render(wrap(<MyApplicationsView />));
    expect(await screen.findByText("No schools yet")).toBeInTheDocument();
  });

  it("prompts to activate access when the student has not paid the access fee", async () => {
    api.GET.mockImplementation(() =>
      Promise.resolve({
        error: { detail: "Your platform access is not active yet.", code: "access_fee_required" },
        response: new Response(null, { status: 403 }),
      }),
    );
    render(wrap(<MyApplicationsView />));
    expect(await screen.findByText("Activate your access")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Activate access" })).toHaveAttribute(
      "href",
      "/ai/billing",
    );
  });
});

describe("NewApplicationView", () => {
  it("shows catalogue programmes as cards and creates an application from a selected intake", async () => {
    api.POST.mockReturnValue(ok({ id: "a1" }));
    render(wrap(<NewApplicationView />));
    expect(await screen.findByRole("heading", { name: "MSc Data Science" })).toBeInTheDocument();
    expect(screen.getByText("Scholarships Available")).toBeInTheDocument();
    expect(screen.getByText("Berlin, DEU")).toBeInTheDocument();
    expect(screen.getByText("Oct 2027")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Create application" }));
    await waitFor(() =>
      expect(api.POST).toHaveBeenCalledWith(
        "/api/applications/",
        expect.objectContaining({
          body: { school: "s1", programme: "p1", intake: "2027-10-01" },
        }),
      ),
    );
  });
});

describe("ApplicationDetailView", () => {
  it("groups checklist items by category and shows progress", async () => {
    api.GET.mockImplementation((path: string) => {
      if (path === "/api/applications/{id}/") {
        return ok({
          id: "a1",
          school: "s1",
          school_name: "Example University",
          programme: "p1",
          programme_name: "MSc Data Science",
          intake: "October 2027",
          status: "preparing",
          status_display: "Preparing documents",
          target_submission_date: null,
          checklist: null,
        });
      }
      if (path === "/api/applications/{id}/checklist/") {
        return ok({
          id: "c1",
          progress_basis: "verified",
          percent_complete: 50,
          percent_uploaded: 50,
          required_count: 2,
          verified_count: 1,
          uploaded_count: 1,
          source_version: 1,
          categories: [
            {
              category: "Academic",
              slug: "academic",
              total: 2,
              verified: 1,
              uploaded: 1,
              percent: 50,
            },
          ],
          items: [
            {
              id: "i1",
              label: "Degree certificate",
              description: "",
              help_text: "",
              category_name: "Academic",
              category_slug: "academic",
              is_required: true,
              priority: "high",
              evidence_type: "document",
              accepted_file_types: [".pdf"],
              max_file_size_mb: 10,
              status: "verified",
              status_display: "Verified",
              rejection_reason: "",
              due_date: null,
              document: null,
              updated_at: "2026-01-01T00:00:00Z",
            },
            {
              id: "i2",
              label: "Transcript",
              description: "",
              help_text: "",
              category_name: "Academic",
              category_slug: "academic",
              is_required: true,
              priority: "high",
              evidence_type: "document",
              accepted_file_types: [".pdf"],
              max_file_size_mb: 10,
              status: "rejected",
              status_display: "Needs attention",
              rejection_reason: "Pages are missing.",
              due_date: null,
              document: null,
              updated_at: "2026-01-01T00:00:00Z",
            },
          ],
        });
      }
      return ok({});
    });
    render(wrap(<ApplicationDetailView id="a1" />));
    expect(await screen.findByText("Example University")).toBeInTheDocument();
    expect(screen.getByText("Academic")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Degree certificate" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Transcript" })).toBeInTheDocument();
    expect(screen.getByText("Pages are missing.")).toBeInTheDocument();
    expect(screen.getByLabelText(/Replace Transcript/)).toBeInTheDocument();
  });
});

describe("DocumentsView", () => {
  it("flags expired documents and shows version history", async () => {
    api.GET.mockImplementation((path: string) => {
      if (path === "/api/documents/") {
        return ok({
          count: 1,
          next: null,
          previous: null,
          results: [
            {
              id: "d1",
              title: "Passport",
              shareable_key: "passport",
              category: "Identity",
              issued_on: null,
              expires_on: "2020-01-01",
              review_status: "rejected",
              is_expired: true,
              current: {
                id: "u2",
                version: 2,
                original_filename: "passport.pdf",
                content_type: "application/pdf",
                size_bytes: 204800,
                status: "rejected",
                rejection_reason: "Photo page is blurred.",
                reviewed_at: null,
                created_at: "2026-01-01T00:00:00Z",
                download_url: "https://example.com/passport.pdf",
              },
              uploads: [
                {
                  id: "u1",
                  version: 1,
                  original_filename: "old-passport.pdf",
                  content_type: "application/pdf",
                  size_bytes: 102400,
                  status: "superseded",
                  rejection_reason: "",
                  reviewed_at: null,
                  created_at: "2025-01-01T00:00:00Z",
                  download_url: null,
                },
                {
                  id: "u2",
                  version: 2,
                  original_filename: "passport.pdf",
                  content_type: "application/pdf",
                  size_bytes: 204800,
                  status: "rejected",
                  rejection_reason: "Photo page is blurred.",
                  reviewed_at: null,
                  created_at: "2026-01-01T00:00:00Z",
                  download_url: "https://example.com/passport.pdf",
                },
              ],
              created_at: "2025-01-01T00:00:00Z",
              updated_at: "2026-01-01T00:00:00Z",
            },
          ],
        });
      }
      return ok({});
    });
    render(wrap(<DocumentsView />));
    expect(await screen.findByText("Passport")).toBeInTheDocument();
    expect(screen.getByText("A document needs replacing")).toBeInTheDocument();
    expect(screen.getByText("Photo page is blurred.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Show earlier versions/ }));
    expect(screen.getByText(/old-passport\.pdf/)).toBeInTheDocument();
  });
});

describe("ReferralsView", () => {
  it("shows the share link, stats and lets a payout be requested", async () => {
    api.GET.mockImplementation((path: string) => {
      if (path === "/api/referrals/mine/") {
        return ok({
          summary: {
            code: "ABC123",
            share_url: "https://nasuru.com/r/ABC123",
            signups: 4,
            conversions: 2,
            total_earned: "20000",
            available_balance: "10000",
            currency: "NGN",
            total_paid_out: "10000",
          },
          events: [
            {
              id: "e1",
              event_type: "signup",
              student_name: "Chidinma",
              is_flagged: false,
              created_at: "2026-01-01T00:00:00Z",
            },
          ],
          rewards: [
            {
              id: "r1",
              amount: "10000",
              currency: "NGN",
              status: "paid",
              trigger: "activation",
              created_at: "2026-01-01T00:00:00Z",
            },
          ],
          payouts: [],
        });
      }
      return ok({});
    });
    api.POST.mockImplementation(() =>
      ok(
        { id: "p1", amount: "10000", status: "requested", requested_at: "2026-01-01T00:00:00Z" },
        201,
      ),
    );
    render(wrap(<ReferralsView />));
    expect(await screen.findByText("https://nasuru.com/r/ABC123")).toBeInTheDocument();
    expect(screen.getByText("Chidinma signed up")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Request payout" }));
    fireEvent.change(await screen.findByLabelText("Bank"), { target: { value: "GTBank" } });
    fireEvent.change(screen.getByLabelText("Account number"), { target: { value: "0123456789" } });
    fireEvent.change(screen.getByLabelText("Account name"), {
      target: { value: "Chidinma Okafor" },
    });
    const buttons = screen.getAllByRole("button", { name: "Request payout" });
    fireEvent.click(buttons[buttons.length - 1]);
    await waitFor(() => expect(api.POST).toHaveBeenCalled());
    expect(api.POST.mock.calls[0][0]).toBe("/api/referrals/payout/");
  });
});
