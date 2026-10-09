import { QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AnnouncerProvider } from "@/components/ui/Announcer";
import { ai } from "@/lib/ai/client";
import { makeQueryClient } from "@/lib/ai/QueryProvider";
import { FundsCheckerView } from "./FundsCheckerView";

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

const DONE_CHECK = {
  id: "fc1",
  documents: [],
  route: "gb-student",
  status: "done",
  extracted: [
    {
      account_holder: "Chidi Track",
      bank: "GTBank",
      currency: "GBP",
      period_start: "2026-08-01",
      period_end: "2026-09-15",
      opening_balance: 8000,
      closing_balance: 9400,
      lines: [
        { date: "2026-08-01", description: "Opening balance", amount: null, balance: 8000 },
        { date: "2026-08-25", description: "Gift from father", amount: 2000, balance: 10900 },
        { date: "2026-09-15", description: "Closing balance", amount: null, balance: 9400 },
      ],
    },
  ],
  results: {
    verdict: "meets",
    currency: "GBP",
    checks: [
      { check: "coverage", outcome: "pass", detail: "Covers 46 days.", days: 46, needed: 28 },
      {
        check: "lowest_balance",
        outcome: "pass",
        detail: "Lowest was 8,000 GBP.",
        lowest: "8000.00",
        needed: 7100,
      },
      {
        check: "large_deposits",
        outcome: "warn",
        detail: "1 large deposit.",
        deposits: [{ date: "2026-08-25", amount: "2000.00", description: "Gift from father" }],
      },
      { check: "age", outcome: "pass", detail: "Recent enough.", days_old: 21 },
      {
        check: "account_holder",
        outcome: "pass",
        detail: "In your name.",
        holders: ["Chidi Track"],
      },
    ],
  },
  task_id: null,
  error: "",
  created_at: "2026-10-06T00:00:00Z",
};

describe("FundsCheckerView", () => {
  it("lists past checks and shows the verdict", async () => {
    api.GET.mockImplementation((path: string) => {
      if (path === "/api/ai/v1/me/funds-checks/") return ok([DONE_CHECK]);
      if (path === "/api/ai/v1/me/eligibility/") return ok({ results: [] });
      return ok({});
    });
    render(wrap(<FundsCheckerView />));
    expect(await screen.findByText("GB-STUDENT")).toBeInTheDocument();
  });

  it("shows the verdict banner and a flagged deposit when a check is opened", async () => {
    api.GET.mockImplementation((path: string) => {
      if (path === "/api/ai/v1/me/funds-checks/") return ok([DONE_CHECK]);
      if (path === "/api/ai/v1/me/funds-checks/{check_id}/") return ok(DONE_CHECK);
      if (path === "/api/ai/v1/me/eligibility/") return ok({ results: [] });
      return ok({});
    });
    render(wrap(<FundsCheckerView />));
    fireEvent.click(await screen.findByText("GB-STUDENT"));
    expect(await screen.findByText("Meets the rule")).toBeInTheDocument();
    expect(screen.getByText(/Gift from father/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Official guidance/ })).toHaveAttribute(
      "href",
      "/ai/visa/gb-student",
    );
  });
});
