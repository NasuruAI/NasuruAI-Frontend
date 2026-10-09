import { QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AnnouncerProvider } from "@/components/ui/Announcer";
import { ai } from "@/lib/ai/client";
import { makeQueryClient } from "@/lib/ai/QueryProvider";
import { ArrivalView } from "./ArrivalView";
import { CredentialsView } from "./CredentialsView";
import { FeesView } from "./FeesView";
import { VisaGuideView } from "./VisaGuideView";

vi.mock("@/lib/ai/client", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/ai/client")>();
  return {
    ...original,
    ai: { GET: vi.fn(), POST: vi.fn(), PATCH: vi.fn(), PUT: vi.fn(), DELETE: vi.fn() },
  };
});

const api = ai as unknown as Record<
  "GET" | "POST" | "PATCH" | "PUT" | "DELETE",
  ReturnType<typeof vi.fn>
>;
const ok = (data: unknown, status = 200) =>
  Promise.resolve({ data, response: new Response(null, { status }) });

afterEach(() => vi.resetAllMocks());

function wrap(children: React.ReactNode) {
  return (
    <QueryClientProvider client={makeQueryClient()}>
      <AnnouncerProvider>{children}</AnnouncerProvider>
    </QueryClientProvider>
  );
}

describe("VisaGuideView", () => {
  it("shows the route's checklist", async () => {
    api.GET.mockImplementation((path: string) => {
      if (path === "/api/ai/v1/routes/{route_code}/") {
        return ok({
          id: "r1",
          code: "gb-student",
          country: "GB",
          name: "Student visa",
          family: "study",
          summary: "",
          requirements: [],
          nationality_gates: [],
        });
      }
      if (path === "/api/ai/v1/me/checklists/{route_code}/") {
        return ok({
          route: "gb-student",
          name: "Student visa",
          done: 1,
          total: 2,
          items: [
            {
              key: "cas",
              title: "Confirmation of Acceptance for Studies",
              detail: "",
              status: "done",
              why: "",
              source_url: "https://www.gov.uk/student-visa",
              stale: false,
            },
            {
              key: "bank-statement",
              title: "28-day bank statement",
              detail: "",
              status: "todo",
              why: "",
              source_url: "https://www.gov.uk/student-visa",
              stale: false,
            },
          ],
        });
      }
      return ok({});
    });
    render(wrap(<VisaGuideView code="gb-student" />));
    expect(await screen.findByRole("heading", { name: "Student visa" })).toBeInTheDocument();
    expect(await screen.findByText("Confirmation of Acceptance for Studies")).toBeInTheDocument();
    expect(screen.getByText("28-day bank statement")).toBeInTheDocument();
  });
});

describe("FeesView", () => {
  it("shows a fee with its card notes", async () => {
    api.GET.mockImplementation((path: string) => {
      if (path === "/api/ai/v1/me/destination/")
        return ok({
          active: null,
          history: [],
          in_first_choice_grace: false,
          next_switch_allowed_at: null,
        });
      if (path === "/api/ai/v1/guide/fees/") {
        return ok({
          country: "GB",
          fees: [
            {
              id: "f1",
              portal: "UKVI",
              label: "Student visa application fee",
              amount: "490.00",
              currency: "GBP",
              naira: { converted: "900000", rate: "1800", as_of: "2026-10-01" },
              card_notes: "Naira Mastercards usually work.",
              alternatives: "",
              url: "",
              source_url: "https://www.gov.uk/student-visa/money",
              verified_at: "2026-10-01T00:00:00Z",
              stale: false,
            },
          ],
        });
      }
      return ok({});
    });
    render(wrap(<FeesView />));
    fireEvent.change(screen.getByLabelText("Country"), { target: { value: "GB" } });
    expect(await screen.findByText("Student visa application fee")).toBeInTheDocument();
    expect(
      screen.getByText("Naira Mastercards usually work.", { exact: false }),
    ).toBeInTheDocument();
  });
});

describe("CredentialsView", () => {
  it("shows a search result for the typed institution", async () => {
    api.GET.mockImplementation((path: string) => {
      if (path === "/api/ai/v1/guide/credentials/") {
        return ok([
          {
            id: "g1",
            institution: "University of Lagos",
            steps: ["Log in to the portal."],
            typical_days: 21,
            fee_text: "₦15,000",
            delivery_options: "",
            letter_template: "",
            notes: "",
            source: "s1",
            verified_at: "2026-10-01T00:00:00Z",
            recheck_after: "2027-10-01T00:00:00Z",
          },
        ]);
      }
      if (path === "/api/ai/v1/me/credential-requests/") return ok([]);
      return ok({});
    });
    render(wrap(<CredentialsView />));
    fireEvent.change(screen.getByLabelText("Find your institution"), {
      target: { value: "Lagos" },
    });
    expect(await screen.findByText("University of Lagos")).toBeInTheDocument();
  });
});

describe("ArrivalView", () => {
  it("toggles an item's done state", async () => {
    api.GET.mockImplementation((path: string) => {
      if (path === "/api/ai/v1/me/destination/")
        return ok({
          active: null,
          history: [],
          in_first_choice_grace: false,
          next_switch_allowed_at: null,
        });
      if (path === "/api/ai/v1/guide/arrival/") {
        return ok({
          items: [
            {
              id: "a1",
              category: "bank",
              title: "Open a UK bank account",
              detail: "",
              city: "London",
              due_within_days: 30,
              due_by: null,
              scam_warning: false,
              done_at: null,
              source_url: "https://www.gov.uk",
              stale: false,
            },
          ],
        });
      }
      return ok({});
    });
    api.PUT.mockImplementation(() => ok(null, 204));
    render(wrap(<ArrivalView />));
    fireEvent.change(screen.getByLabelText("Country"), { target: { value: "GB" } });
    fireEvent.change(screen.getByLabelText(/^City/), { target: { value: "London" } });
    const checkbox = await screen.findByLabelText("Open a UK bank account");
    fireEvent.click(checkbox);
    await waitFor(() =>
      expect(api.PUT).toHaveBeenCalledWith(
        "/api/ai/v1/me/arrival/{item_id}/",
        expect.objectContaining({ body: { done: true } }),
      ),
    );
  });
});
