import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AnnouncerProvider } from "@/components/ui/Announcer";
import { ai } from "@/lib/ai/client";
import { makeQueryClient } from "@/lib/ai/QueryProvider";
import { InterviewHome } from "./InterviewHome";
import { SessionView } from "./SessionView";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/ai/interview",
  useSearchParams: () => new URLSearchParams(),
}));

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

describe("InterviewHome", () => {
  it("shows the kind picker and a session's score in its history", async () => {
    api.GET.mockImplementation((path: string) => {
      if (path === "/api/ai/v1/me/coaching/sessions/") {
        return ok([
          {
            id: "s1",
            kind: "visa",
            kind_label: "Visa interview",
            job: null,
            job_title: null,
            route: "gb-student",
            questions: [],
            status: "complete",
            summary: { overall: 4.2, weakest_question: 1 },
            attempts: [],
            task_id: null,
            error: "",
            error_code: "",
            created_at: "2026-10-01T00:00:00Z",
          },
        ]);
      }
      if (path === "/api/ai/v1/me/eligibility/") return ok({ results: [] });
      return ok({});
    });
    render(wrap(<InterviewHome />));
    expect(await screen.findByRole("heading", { name: "Interview practice" })).toBeInTheDocument();
    expect(screen.getByText("Job interview")).toBeInTheDocument();
    expect(await screen.findByText("Visa interview")).toBeInTheDocument();
    expect(screen.getByText("4.2/5")).toBeInTheDocument();
  });

  it("doesn't crash when a session's summary is the empty-object default", async () => {
    api.GET.mockImplementation((path: string) => {
      if (path === "/api/ai/v1/me/coaching/sessions/") {
        return ok([
          {
            id: "s2",
            kind: "visa",
            kind_label: "Visa interview",
            job: null,
            job_title: null,
            route: "gb-student",
            questions: [],
            status: "preparing",
            summary: {},
            attempts: [],
            task_id: null,
            error: "",
            error_code: "",
            created_at: "2026-10-01T00:00:00Z",
          },
        ]);
      }
      if (path === "/api/ai/v1/me/eligibility/") return ok({ results: [] });
      return ok({});
    });
    render(wrap(<InterviewHome />));
    expect(await screen.findByText("Preparing…")).toBeInTheDocument();
    expect(screen.queryByText(/NaN/)).not.toBeInTheDocument();
  });
});

const JOB_SESSION = {
  id: "s3",
  kind: "job" as const,
  kind_label: "Job interview",
  job: "j1",
  job_title: "Backend Engineer",
  route: null,
  questions: [
    { text: "Tell me about a time you debugged a hard bug.", why_asked: "Checks troubleshooting." },
  ],
  status: "ready" as const,
  summary: {},
  attempts: [
    {
      id: "a1",
      index: 0,
      number: 1,
      transcript: "I found the bug by checking the logs.",
      duration_seconds: 40,
      status: "scored" as const,
      scores: {
        content: 4,
        clarity: 4,
        pace: 5,
        words_per_minute: 140,
        star: { situation: true, task: true, action: true, result: true },
        structure: 5,
        overall: 4.5,
        improvements: ["Mention the outcome for the team."],
      },
      feedback: "Clear and well-structured answer.",
      task_id: null,
      created_at: "2026-10-01T00:00:00Z",
    },
  ],
  task_id: null,
  error: "",
  error_code: "",
  created_at: "2026-10-01T00:00:00Z",
};

describe("SessionView", () => {
  it("shows the question and a scored attempt's feedback with STAR labels", async () => {
    api.GET.mockImplementation((path: string) => {
      if (path === "/api/ai/v1/me/coaching/sessions/{session_id}/") return ok(JOB_SESSION);
      return ok({});
    });
    render(wrap(<SessionView sessionId="s3" />));
    expect(
      await screen.findByText("Tell me about a time you debugged a hard bug."),
    ).toBeInTheDocument();
    expect(screen.getByText("Clear and well-structured answer.")).toBeInTheDocument();
    expect(screen.getByText("Situation")).toBeInTheDocument();
    expect(screen.getByText("Mention the outcome for the team.")).toBeInTheDocument();
  });

  it("still shows per-question feedback once the session is complete", async () => {
    api.GET.mockImplementation((path: string) => {
      if (path === "/api/ai/v1/me/coaching/sessions/{session_id}/") {
        return ok({
          ...JOB_SESSION,
          status: "complete",
          summary: {
            content: 4,
            clarity: 4,
            pace: 5,
            structure: 5,
            overall: 4.5,
            weakest_question: 0,
          },
        });
      }
      return ok({});
    });
    render(wrap(<SessionView sessionId="s3" />));
    expect(await screen.findByText(/Overall:/)).toBeInTheDocument();
    expect(screen.getByText("Clear and well-structured answer.")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Try this question again/ }),
    ).not.toBeInTheDocument();
  });
});
