import { QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AnnouncerProvider } from "@/components/ui/Announcer";
import { ai } from "@/lib/ai/client";
import {
  arrivalMonth,
  type BoardCard,
  costLines,
  planKeys,
  type PlanResponse,
  type Todo,
  upcomingDeadlines,
} from "@/lib/ai/plan";
import { makeQueryClient } from "@/lib/ai/QueryProvider";
import { ToastProvider } from "../Toast";
import { shareUrl } from "./ShareDialog";
import { TodoList } from "./TodoList";

vi.mock("@/lib/ai/client", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/ai/client")>();
  return { ...original, ai: { GET: vi.fn(), POST: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() } };
});

const api = ai as unknown as Record<"GET" | "POST" | "PATCH" | "DELETE", ReturnType<typeof vi.fn>>;
const ok = (data: unknown, status = 200) =>
  Promise.resolve({ data, response: new Response(null, { status }) });

// resetAllMocks, not clearAllMocks: a queued mockImplementationOnce must not leak into the next test.
afterEach(() => vi.resetAllMocks());

const card = (patch: Partial<BoardCard>): BoardCard =>
  ({
    id: "c",
    kind: "programme",
    title: "MSc Data Science",
    organisation: "TU Berlin",
    country: "DE",
    state: "saved",
    state_label: "Saved",
    next_states: [],
    deadline: "2026-10-15",
    updated_at: "2026-09-25T10:00:00Z",
    ...patch,
  }) as BoardCard;

describe("plan helpers", () => {
  it("lists deadlines still ahead for applications not yet sent, soonest first", () => {
    const now = new Date(2026, 8, 25);
    const columns = [
      {
        cards: [
          card({ id: "later", deadline: "2026-11-30" }),
          card({ id: "soon", deadline: "2026-09-30", state: "pack_ready" }),
          card({ id: "today", deadline: "2026-09-25" }),
          card({ id: "past", deadline: "2026-09-01" }),
          card({ id: "applied", deadline: "2026-10-01", state: "applied" }),
          card({ id: "none", deadline: null as unknown as string }),
        ],
      },
    ];
    expect(upcomingDeadlines(columns, now).map((c) => c.id)).toEqual(["today", "soon", "later"]);
    expect(upcomingDeadlines(columns, now, 1)).toHaveLength(1);
  });

  it("works out the arrival month", () => {
    expect(arrivalMonth(10, new Date(2026, 8, 25))).toBe("Jul 2027");
  });

  it("turns cost items into breakdown lines, leaving out ones without a rate", () => {
    const lines = costLines([
      {
        route: "de-blue-card",
        category: "visa_fee",
        label: "Visa fee",
        amount: "75",
        currency: "EUR",
        ngn: "127500",
        source_name: "Auswärtiges Amt",
        verified_at: "2026-09-01",
        is_stale: false,
      },
      {
        route: "de-blue-card",
        category: "proof_of_funds",
        label: "Blocked account",
        amount: "11208",
        currency: "EUR",
        ngn: "19000000",
      },
      {
        route: "de-blue-card",
        category: "test",
        label: "Goethe B1",
        amount: "300",
        currency: "CHF",
        ngn: null,
      },
    ]);
    expect(lines).toHaveLength(2);
    expect(lines[0]).toMatchObject({
      kind: "visa",
      naira: 127500,
      foreign: { amount: 75, currency: "EUR" },
      source: { name: "Auswärtiges Amt", checkedOn: "2026-09-01" },
    });
    expect(lines[1].kind).toBe("proof_of_funds");
  });

  it("builds the family link on this site", () => {
    expect(shareUrl("abc", "https://nasuru.ai")).toBe("https://nasuru.ai/ai/share/abc");
  });
});

describe("TodoList", () => {
  const todo = (id: string, patch: Partial<Todo> = {}): Todo => ({
    id,
    key: `de-blue-card:${id}`,
    title: `Step ${id}`,
    detail: "",
    route_code: "de-blue-card",
    status: "open",
    sort_order: 1,
    done_at: null,
    version: 1,
    ...patch,
  });

  function setup(todos: Todo[]) {
    const client = makeQueryClient();
    const data: PlanResponse = { plan: null, todos, share: null };
    client.setQueryData(planKeys.plan, data);
    function Harness() {
      // Re-render from the cache, as PlanView does.
      const current = client.getQueryData<PlanResponse>(planKeys.plan) ?? data;
      return <TodoList todos={current.todos} />;
    }
    const view = render(
      <QueryClientProvider client={client}>
        <AnnouncerProvider>
          <ToastProvider>
            <Harness />
          </ToastProvider>
        </AnnouncerProvider>
      </QueryClientProvider>,
    );
    return {
      client,
      rerender: () =>
        view.rerender(
          <QueryClientProvider client={client}>
            <AnnouncerProvider>
              <ToastProvider>
                <Harness />
              </ToastProvider>
            </AnnouncerProvider>
          </QueryClientProvider>,
        ),
    };
  }

  it("ticks at once, then undoes with the version the tick produced", async () => {
    api.PATCH.mockImplementationOnce(() => ok(todo("a", { status: "done", version: 2 })));
    api.PATCH.mockImplementationOnce(() => ok(todo("a", { status: "open", version: 3 })));
    const { client } = setup([todo("a"), todo("b")]);

    fireEvent.click(screen.getByRole("checkbox", { name: /Step a/ }));
    // Optimistic: the cache says done before the server answers.
    await waitFor(() =>
      expect(client.getQueryData<PlanResponse>(planKeys.plan)?.todos[0].status).toBe("done"),
    );
    await waitFor(() => expect(api.PATCH).toHaveBeenCalledTimes(1));
    expect(api.PATCH.mock.calls[0][1].body).toEqual({ version: 1, done: true });

    const toast = await screen.findByText("Done: Step a");
    await act(async () => {
      fireEvent.click(
        within(toast.closest("[role=status], div")!.parentElement!).getByRole("button", {
          name: "Undo",
        }),
      );
    });
    await waitFor(() => expect(api.PATCH).toHaveBeenCalledTimes(2));
    expect(api.PATCH.mock.calls[1][1].body).toEqual({ version: 2, done: false });
  });

  it("rolls back and says why when another device got there first", async () => {
    api.PATCH.mockImplementationOnce(() =>
      Promise.resolve({
        data: undefined,
        error: { detail: "This changed on another device.", code: "version_conflict" },
        response: new Response(null, { status: 409 }),
      }),
    );
    api.GET.mockImplementation(() => ok({ plan: null, todos: [todo("a")], share: null }));
    setup([todo("a")]);
    fireEvent.click(screen.getByRole("checkbox", { name: /Step a/ }));
    expect(await screen.findByText(/changed on another device/)).toBeInTheDocument();
  });
});
