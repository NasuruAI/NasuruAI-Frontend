import { QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AnnouncerProvider } from "@/components/ui/Announcer";
import { ai } from "@/lib/ai/client";
import { makeQueryClient } from "@/lib/ai/QueryProvider";
import type { Card } from "@/lib/ai/track";
import { ApplicationDetailView } from "./ApplicationDetailView";
import { TrackBoard } from "./TrackBoard";

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
      <AnnouncerProvider>{children}</AnnouncerProvider>
    </QueryClientProvider>
  );
}

const SAVED_CARD = {
  id: "c1",
  kind: "job" as const,
  job: "j1",
  title: "Backend Engineer",
  organisation: "Acme Berlin GmbH",
  country: "DE",
  state: "saved" as const,
  state_label: "Saved",
  next_states: [
    { state: "pack_ready" as const, label: "Answers ready" },
    { state: "applied" as const, label: "Applied" },
    { state: "withdrawn" as const, label: "Withdrawn" },
  ],
  version: 1,
  applied_at: null,
  visa_outcome: "",
  deadline: "2027-06-01",
  notes: "",
  pending_suggestion: null,
  updated_at: "2026-10-01T00:00:00Z",
} satisfies Card;

function board(cards: Card[]) {
  const byState = new Map<string, Card[]>();
  for (const card of cards) {
    const state = card.state ?? "saved";
    byState.set(state, [...(byState.get(state) ?? []), card]);
  }
  const labels: Record<string, string> = {
    saved: "Saved",
    pack_ready: "Answers ready",
    applied: "Applied",
    interview: "Interview",
    offer: "Offer",
    visa_filed: "Visa filed",
    visa_decided: "Visa decided",
    arrived: "Arrived",
  };
  return {
    columns: Object.entries(labels).map(([state, label]) => ({
      state,
      label,
      cards: byState.get(state) ?? [],
    })),
  };
}

describe("TrackBoard", () => {
  it("shows cards on the board grouped by stage", async () => {
    api.GET.mockImplementation((path: string) => {
      if (path === "/api/ai/v1/me/applications/") return ok(board([SAVED_CARD]));
      return ok({});
    });
    render(wrap(<TrackBoard />));
    expect(await screen.findByText("Backend Engineer")).toBeInTheDocument();
    expect(screen.getByText("Acme Berlin GmbH")).toBeInTheDocument();
  });

  it("shows a dashed suggestion ghost card with accept and dismiss", async () => {
    const withSuggestion = {
      ...SAVED_CARD,
      pending_suggestion: {
        id: "s1",
        proposed_state: "pack_ready" as const,
        proposed_state_label: "Answers ready",
        summary: "We saw an email confirming your application.",
      },
    };
    api.GET.mockImplementation((path: string) => {
      if (path === "/api/ai/v1/me/applications/") return ok(board([withSuggestion]));
      return ok({});
    });
    render(wrap(<TrackBoard />));
    expect(await screen.findByText(/Suggested: move to/)).toBeInTheDocument();
    expect(screen.getByText("We saw an email confirming your application.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Accept/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Dismiss/ })).toBeInTheDocument();
  });

  it("moves a card to a new stage via the Move to select", async () => {
    api.GET.mockImplementation((path: string) => {
      if (path === "/api/ai/v1/me/applications/") return ok(board([SAVED_CARD]));
      return ok({});
    });
    api.POST.mockImplementation((path: string) => {
      if (path === "/api/ai/v1/me/applications/{card_id}/move/") {
        return ok({ ...SAVED_CARD, state: "pack_ready", version: 2 });
      }
      return ok({});
    });
    render(wrap(<TrackBoard />));
    await screen.findByText("Backend Engineer");
    const select = screen.getByRole("combobox", { name: "Move Backend Engineer" });
    fireEvent.change(select, { target: { value: "pack_ready" } });
    await waitFor(() =>
      expect(api.POST).toHaveBeenCalledWith(
        "/api/ai/v1/me/applications/{card_id}/move/",
        expect.objectContaining({
          body: expect.objectContaining({ to: "pack_ready", version: 1 }),
        }),
      ),
    );
  });

  it("falls back to the list view with the same cards", async () => {
    api.GET.mockImplementation((path: string) => {
      if (path === "/api/ai/v1/me/applications/") return ok(board([SAVED_CARD]));
      return ok({});
    });
    render(wrap(<TrackBoard />));
    await screen.findByText("Backend Engineer");
    fireEvent.click(screen.getByText("List view"));
    expect(screen.getByText("Backend Engineer")).toBeInTheDocument();
  });
});

describe("ApplicationDetailView", () => {
  it("shows the timeline, notes and a way to the originating job", async () => {
    api.GET.mockImplementation((path: string) => {
      if (path === "/api/ai/v1/me/applications/{card_id}/") {
        return ok({
          ...SAVED_CARD,
          state: "interview",
          state_label: "Interview",
          notes: "Called the recruiter.",
          events: [
            {
              to_state: "saved",
              version: 1,
              actor: "candidate",
              note: "",
              created_at: "2026-10-01T00:00:00Z",
            },
            {
              from_state: "saved",
              to_state: "applied",
              version: 2,
              actor: "candidate",
              note: "Submitted via the portal",
              created_at: "2026-10-02T00:00:00Z",
            },
          ],
          suggestions: [],
        });
      }
      return ok({});
    });
    render(wrap(<ApplicationDetailView applicationId="c1" />));
    expect(await screen.findByRole("heading", { name: "Backend Engineer" })).toBeInTheDocument();
    expect(screen.getByText("Timeline")).toBeInTheDocument();
    expect(screen.getByText(/moved it from Saved to Applied/)).toBeInTheDocument();
    expect(screen.getByText("Submitted via the portal", { exact: false })).toBeInTheDocument();
    expect(screen.getByDisplayValue("Called the recruiter.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open the job" })).toHaveAttribute(
      "href",
      "/ai/jobs/j1",
    );
  });
});
