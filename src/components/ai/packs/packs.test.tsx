import { QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AnnouncerProvider } from "@/components/ui/Announcer";
import { ai } from "@/lib/ai/client";
import { answerLine, fileName, type Pack, type PackAnswer, packAsText } from "@/lib/ai/packs";
import { makeQueryClient } from "@/lib/ai/QueryProvider";
import { ToastProvider } from "../Toast";
import { NewPackView } from "./PacksView";
import { buildSteps, PackView } from "./PackView";
import { factUses } from "./SourcePanel";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: vi.fn() }),
  usePathname: () => "/ai/packs/p1",
}));

vi.mock("@/lib/ai/client", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/ai/client")>();
  return { ...original, ai: { GET: vi.fn(), POST: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() } };
});

const api = ai as unknown as Record<"GET" | "POST" | "PATCH" | "DELETE", ReturnType<typeof vi.fn>>;
const ok = (data: unknown, status = 200) =>
  Promise.resolve({ data, response: new Response(null, { status }) });
const fail = (status: number, error: unknown) =>
  Promise.resolve({ data: undefined, error, response: new Response(null, { status }) });

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

const field = (label: string, extra: Partial<PackAnswer["field"]> = {}) =>
  ({
    key: label.toLowerCase().replace(/\W+/g, "_"),
    label,
    help_text: "",
    type: "text",
    options: [],
    required: false,
    max_length: null,
    category: "personal",
    section: "Application",
    ...extra,
  }) as PackAnswer["field"];

const answer = (id: string, label: string, patch: Partial<PackAnswer> = {}): PackAnswer =>
  ({
    id,
    field: field(label),
    kind: "filled",
    kind_label: "From your profile",
    value: "",
    source: "",
    fact_ids: [],
    claims: [],
    guidance: "",
    flagged: false,
    edited: false,
    draft: "",
    previous: "",
    copyable: true,
    characters: 0,
    regenerating: false,
    regenerations_left: 0,
    ...patch,
  }) as PackAnswer;

const why = answer("a3", "Why Acme?", {
  field: field("Why Acme?", { type: "textarea", category: "free_text", max_length: 500 }),
  kind: "written",
  value:
    "I have worked as a data analyst at First Bank since 2019. Acme's data work is why I'm applying.",
  draft:
    "I have worked as a data analyst at First Bank since 2019. Acme's data work is why I'm applying.",
  source: "Written from 1 of your profile facts and the job posting",
  fact_ids: ["f1"],
  claims: [
    { sentence: "I have worked as a data analyst at First Bank since 2019.", sources: ["f1"] },
    { sentence: "Acme's data work is why I'm applying.", sources: ["job"] },
  ],
  regenerations_left: 3,
});

const pack: Pack = {
  id: "p1",
  job: "j1",
  job_title: "Data Analyst",
  employer: "Acme",
  status: "ready",
  status_label: "Ready",
  profile_version: 3,
  task_id: null,
  error: "",
  error_code: "",
  created_at: "2026-09-25T13:58:00Z",
  completed_at: "2026-09-25T14:02:00Z",
  form: { ats: "greenhouse", apply_url: "https://boards.greenhouse.io/acme/jobs/1", note: "" },
  counts: { filled: 2, written: 1, you_answer: 1, upload: 1, missing: 0 },
  sections: [
    {
      section: "Application",
      answers: [
        answer("a1", "First Name", { value: "Chidinma", source: "Account" }),
        answer("a2", "Current Company", { value: "First Bank", fact_ids: ["f1"] }),
        why,
        answer("a4", "Resume/CV", {
          kind: "upload",
          field: field("Resume/CV", { type: "file", category: "file_upload" }),
          guidance: "Upload your CV.",
        }),
      ],
    },
    {
      section: "Equal opportunities",
      answers: [
        answer("a5", "Will you need sponsorship?", {
          kind: "you_answer",
          guidance: "Answer truthfully: this job is in the United Kingdom.",
        }),
      ],
    },
  ],
  facts: [
    {
      id: "f1",
      kind: "work",
      data: { title: "Data Analyst", employer: "First Bank", start: "2019-01", current: true },
      status: "confirmed",
    },
  ],
  progress: null,
} as unknown as Pack;

function packApi(current: Pack = pack) {
  api.GET.mockImplementation((path: string) => {
    if (path === "/api/ai/v1/me/answer-packs/{pack_id}/") return ok(current);
    if (path === "/api/ai/v1/me/generated-documents/") return ok([]);
    if (path === "/api/ai/v1/me/applications/") return ok({ columns: [] });
    return ok({});
  });
}

describe("pack helpers", () => {
  it("exports a numbered list in the form's order, saying what's left to do", () => {
    const text = packAsText(pack);
    expect(text).toContain("Answers for Acme · Data Analyst");
    expect(text).toContain("1. First Name\n   Chidinma");
    expect(text).toContain("4. Resume/CV\n   (upload a file)");
    expect(text).toContain(
      "EQUAL OPPORTUNITIES\n5. Will you need sponsorship?\n   (you answer this one yourself)",
    );
    expect(answerLine(answer("x", "Phone", { kind: "missing" }))).toBe("(not in your profile)");
  });

  it("shows the build's steps with the count", () => {
    expect(buildSteps({ status: "reading_form", progress: null }).map((s) => s.state)).toEqual([
      "active",
      "pending",
      "pending",
    ]);
    const answering = buildSteps({ status: "answering", progress: { done: 12, total: 19 } });
    expect(answering[1]).toEqual({
      label: "Answering from your profile (12 of 19)",
      state: "active",
    });
  });

  it("reads the download's file name", () => {
    expect(fileName('attachment; filename="CV-Ada-GB.pdf"', "cv.pdf")).toBe("CV-Ada-GB.pdf");
    expect(fileName(null, "cv.pdf")).toBe("cv.pdf");
  });

  it("knows where each fact is used", () => {
    expect(factUses(pack).get("f1")).toEqual([{ answer: "Why Acme?", sentence: 1 }]);
  });
});

describe("PackView", () => {
  it("shows the sections, and a sentence's source fact when it's chosen", async () => {
    packApi();
    render(wrap(<PackView id="p1" />));
    expect(
      await screen.findByRole("heading", { name: "Answers for Acme · Data Analyst" }),
    ).toBeInTheDocument();
    expect(screen.getByText("3 ready")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Equal opportunities" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Open form/ })).toHaveAttribute(
      "href",
      "https://boards.greenhouse.io/acme/jobs/1",
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "I have worked as a data analyst at First Bank since 2019.",
      }),
    );
    const panel = await screen.findByRole("dialog");
    expect(within(panel).getByText("Data Analyst, First Bank")).toBeInTheDocument();
    expect(within(panel).getByText("(this sentence)")).toBeInTheDocument();
  });

  it("edits in place within the form's limit", async () => {
    packApi();
    api.PATCH.mockImplementation(() => ok({ ...why, value: "My own words.", edited: true }));
    render(wrap(<PackView id="p1" />));
    const row = (await screen.findByRole("heading", { name: "Why Acme?" })).closest("article")!;
    fireEvent.click(within(row).getByRole("button", { name: /Edit/ }));
    const box = within(row).getByLabelText("Your answer to Why Acme?");
    expect(within(row).getByText(`${why.value!.length} / 500`)).toBeInTheDocument();
    fireEvent.change(box, { target: { value: "My own words." } });
    fireEvent.click(within(row).getByRole("button", { name: "Save" }));
    await waitFor(() => expect(api.PATCH).toHaveBeenCalled());
    expect(api.PATCH.mock.calls[0][1]).toMatchObject({
      params: { path: { pack_id: "p1", answer_id: "a3" } },
      body: { value: "My own words." },
    });
    expect(await within(row).findByText("You edited our draft.")).toBeInTheDocument();
  });

  it("writes an answer again, showing how many tries are left", async () => {
    packApi();
    api.POST.mockImplementation(() => ok({ ...why, regenerating: true }, 202));
    render(wrap(<PackView id="p1" />));
    const again = await screen.findByRole("button", { name: /Write again Why Acme\? \(3 left\)/ });
    fireEvent.click(again);
    await waitFor(() => expect(api.POST).toHaveBeenCalled());
    expect(api.POST.mock.calls[0][0]).toBe(
      "/api/ai/v1/me/answer-packs/{pack_id}/answers/{answer_id}/regenerate/",
    );
    expect(await screen.findByText("Writing this again…")).toBeInTheDocument();
  });

  it("marks the job applied by moving its card", async () => {
    packApi();
    api.POST.mockImplementation((path: string) =>
      path === "/api/ai/v1/me/applications/"
        ? ok({ id: "c1", job: "j1", state: "pack_ready", version: 2 })
        : ok({
            id: "c1",
            job: "j1",
            state: "applied",
            version: 3,
            applied_at: "2026-09-25T15:00:00Z",
          }),
    );
    render(wrap(<PackView id="p1" />));
    fireEvent.click(await screen.findByRole("button", { name: "Mark as applied" }));
    expect(await screen.findByText(/Applied on 25 Sep/)).toBeInTheDocument();
    const move = api.POST.mock.calls.find(([path]) => String(path).endsWith("/move/"))!;
    expect(move[1].body).toMatchObject({ to: "applied", version: 2 });
  });

  it("shows the answers so far while the pack is being written", async () => {
    packApi({
      ...pack,
      status: "answering",
      progress: { stage: "answering", done: 3, total: 5 },
    } as Pack);
    render(wrap(<PackView id="p1" />));
    expect(await screen.findByText("Answering from your profile (3 of 5)")).toBeInTheDocument();
    expect(screen.getByText("Chidinma")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Mark as applied" })).not.toBeInTheDocument();
  });
});

describe("NewPackView", () => {
  it("opens the pack for a job we list", async () => {
    api.POST.mockImplementation(() => ok({ id: "p9" }, 202));
    render(wrap(<NewPackView />));
    fireEvent.change(screen.getByLabelText("Job link"), {
      target: { value: "boards.greenhouse.io/acme/jobs/1" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Prepare answers" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/ai/packs/p9"));
    expect(api.POST.mock.calls[0][1].body).toEqual({ url: "boards.greenhouse.io/acme/jobs/1" });
  });

  it("says when a form needs the extension, with the way there", async () => {
    api.POST.mockImplementation(() =>
      fail(400, {
        detail: "This form is on Workday, which needs you to sign in.",
        code: "needs_extension",
        system: "Workday",
      }),
    );
    render(wrap(<NewPackView />));
    fireEvent.change(screen.getByLabelText("Job link"), {
      target: { value: "https://acme.wd3.myworkdayjobs.com/job/1" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Prepare answers" }));
    expect(await screen.findByText("This form needs you to sign in")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Set up the extension" })).toHaveAttribute(
      "href",
      "/ai/settings/extension",
    );
    expect(screen.getByRole("link", { name: /Open the form/ })).toHaveAttribute(
      "href",
      "https://acme.wd3.myworkdayjobs.com/job/1",
    );
  });

  it("asks for a link before sending anything", () => {
    render(wrap(<NewPackView />));
    fireEvent.click(screen.getByRole("button", { name: "Prepare answers" }));
    expect(screen.getByText("Paste the job's link first.")).toBeInTheDocument();
    expect(api.POST).not.toHaveBeenCalled();
  });
});
