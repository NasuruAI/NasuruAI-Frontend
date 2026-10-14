import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ai } from "@/lib/ai/client";
import { makeQueryClient } from "@/lib/ai/QueryProvider";
import { SharedPlanView } from "./SharedPlanView";

vi.mock("@/lib/ai/client", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/ai/client")>();
  return { ...original, ai: { GET: vi.fn() } };
});

const api = ai as unknown as { GET: ReturnType<typeof vi.fn> };
const ok = (data: unknown, status = 200) =>
  Promise.resolve({ data, response: new Response(null, { status }) });
const fail = (status: number) =>
  Promise.resolve({
    data: undefined,
    error: { detail: "nope" },
    response: new Response(null, { status }),
  });

afterEach(() => vi.resetAllMocks());

function wrap(children: React.ReactNode) {
  return <QueryClientProvider client={makeQueryClient()}>{children}</QueryClientProvider>;
}

const SHARED = {
  shared_by: "Ezechukwu",
  plan: {
    title: "EU Blue Card",
    steps: [{ name: "EU Blue Card", country: "DE", status: "eligible_if" }],
    months_to_arrival: 5,
    leads_to_pr: true,
    cost: { spend_ngn: "0", proof_of_funds_ngn: "0", complete: false },
  },
  progress: { done: 1, open: 2 },
};

describe("SharedPlanView", () => {
  it("shows the plan title, progress and the revocable footer", async () => {
    api.GET.mockImplementation(() => ok(SHARED));
    render(wrap(<SharedPlanView token="tok" />));
    expect(await screen.findByRole("heading", { name: "EU Blue Card" })).toBeInTheDocument();
    expect(screen.getByText(/leads to permanent residence/)).toBeInTheDocument();
    expect(screen.getByText(/of 3 steps done/)).toBeInTheDocument();
    expect(screen.getByText(/Shared by Ezechukwu/)).toBeInTheDocument();
  });

  it("says a cost isn't priced yet rather than showing a misleading total", async () => {
    api.GET.mockImplementation(() => ok(SHARED));
    render(wrap(<SharedPlanView token="tok" />));
    await screen.findByRole("heading", { name: "EU Blue Card" });
    // spend and proof are both 0, so no cost section renders; nothing claims ₦0 spent.
    expect(screen.queryByText("Total cost")).not.toBeInTheDocument();
  });

  it("shows a 'no plan yet' note when the candidate hasn't chosen one", async () => {
    api.GET.mockImplementation(() =>
      ok({ shared_by: "Ada", plan: null, progress: { done: 0, open: 0 } }),
    );
    render(wrap(<SharedPlanView token="tok" />));
    expect(await screen.findByText("No plan chosen yet")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Ada's plan" })).toBeInTheDocument();
  });

  it("shows a plain 'link isn't active' message on a revoked or unknown token", async () => {
    api.GET.mockImplementation(() => fail(404));
    render(wrap(<SharedPlanView token="gone" />));
    expect(await screen.findByText("This link isn't active")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /plan/ })).not.toBeInTheDocument();
  });
});
