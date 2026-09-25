import { QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AnnouncerProvider } from "@/components/ui/Announcer";
import { ai } from "@/lib/ai/client";
import {
  type Me,
  minutesLeft,
  nextStep,
  previousStep,
  type ProfileFact,
  resumeStep,
} from "@/lib/ai/onboarding";
import { makeQueryClient } from "@/lib/ai/QueryProvider";
import { sha256Hex, uploadResumable } from "@/lib/ai/upload";
import { factView, partialDate } from "./facts";
import { FactsStep } from "./FactsStep";
import { missingAnswers } from "./QuestionsStep";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/ai/start/facts",
}));

vi.mock("@/lib/ai/client", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/ai/client")>();
  return { ...original, ai: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn() } };
});

const api = vi.mocked(ai, { deep: false }) as unknown as Record<
  "GET" | "POST" | "PUT" | "PATCH",
  ReturnType<typeof vi.fn>
>;
const ok = (data: unknown, status = 200) =>
  Promise.resolve({ data, response: new Response(null, { status }) });

afterEach(() => vi.resetAllMocks());

const me = (patch: Partial<Me> = {}): Me => ({
  id: "c1",
  email: "",
  first_name: "Ada",
  destination: null,
  counts: { documents: 0, facts_unconfirmed: 0, facts_confirmed: 0 },
  questionnaire_complete: false,
  onboarding_completed_at: null,
  ...patch,
});

describe("steps", () => {
  it("resumes at the first step with something left to do", () => {
    expect(resumeStep(me(), false)).toBe("welcome");
    expect(resumeStep(me({ questionnaire_complete: true }), false)).toBe("upload");
    const withCv = { documents: 1, facts_unconfirmed: 0 };
    expect(resumeStep(me({ counts: withCv }), false)).toBe("questions");
    expect(
      resumeStep(
        me({ counts: { documents: 1, facts_unconfirmed: 3 }, questionnaire_complete: true }),
        false,
      ),
    ).toBe("facts");
    const answered = me({ counts: withCv, questionnaire_complete: true });
    expect(resumeStep(answered, false)).toBe("occupation");
    expect(resumeStep(answered, true)).toBe("destination");
    expect(resumeStep({ ...answered, destination: "DE" }, true)).toBe("results");
    expect(resumeStep(me({ onboarding_completed_at: "2026-09-25T10:00:00Z" }), false)).toBe("done");
  });

  it("counts the time left and moves between steps", () => {
    expect(minutesLeft("welcome")).toBe(14);
    expect(minutesLeft("results")).toBe(1);
    expect(nextStep("welcome")).toBe("upload");
    expect(nextStep("results")).toBeNull();
    expect(previousStep("welcome")).toBeNull();
    expect(previousStep("facts")).toBe("questions");
  });

  it("lists the answers the rules still need", () => {
    const missing = missingAnswers({
      nationality: "NG",
      date_of_birth: "1996-04-02",
      marital_status: "single",
      dependants: 0,
      savings_band: "",
      previous_refusals: false,
      open_to_study: null,
    });
    expect(missing.map((item) => item.field)).toEqual([
      "savings_band",
      "open_to_study",
      "open_to_retrain",
    ]);
  });
});

describe("facts", () => {
  it("reads each kind the way a person would", () => {
    expect(partialDate("2022-03")).toBe("Mar 2022");
    expect(partialDate("2019")).toBe("2019");
    expect(
      factView({
        kind: "work",
        data: {
          title: "Data analyst",
          employer: "Paystack",
          start: "2022-03",
          current: true,
          city: "Lagos",
        },
      }),
    ).toEqual({
      title: "Data analyst, Paystack",
      subtitle: "Mar 2022 – now · Lagos",
      detail: undefined,
    });
    expect(
      factView({
        kind: "education",
        data: {
          qualification: "B.Sc. Statistics",
          institution: "UNILAG",
          grade: "Second Class Upper",
        },
      }).detail,
    ).toBe("Grade: Second Class Upper");
    expect(
      factView({
        kind: "test_score",
        data: {
          test: "IELTS_UKVI",
          overall: "7.5",
          components: [{ name: "Listening", score: "8" }],
        },
      }),
    ).toMatchObject({ title: "IELTS UKVI 7.5", detail: "Listening 8" });
    expect(factView({ kind: "language", data: { language: "French", level: "B2" } }).subtitle).toBe(
      "B2",
    );
  });
});

describe("resumable upload", () => {
  const file = new File([new Uint8Array(2.5 * 1024 * 1024)], "cv.pdf", { type: "application/pdf" });
  const session = {
    id: "s1",
    kind: "cv",
    filename: "cv.pdf",
    size_bytes: file.size,
    chunk_size: 1024 * 1024,
    total_chunks: 3,
    received: [0],
    status: "open",
    expires_at: "2026-09-26T10:00:00Z",
  };

  beforeEach(() => localStorage.clear());

  it("hashes the file", async () => {
    expect(await sha256Hex(new Blob(["abc"]))).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });

  it("sends only the chunks the server hasn't got, then completes", async () => {
    api.POST.mockImplementation((path: string) =>
      path.endsWith("/complete/")
        ? ok({ id: "d1", kind: "cv", status: "extracting" }, 201)
        : ok(session, 201),
    );
    api.PUT.mockImplementation(() => ok({ received: [] }));
    const progress: number[] = [];
    const document = await uploadResumable(file, "cv", {
      onProgress: ({ sent }) => progress.push(sent),
    });
    expect(document).toMatchObject({ id: "d1", status: "extracting" });
    const sentChunks = api.PUT.mock.calls.map(([, options]) => options.params.path.index);
    expect(sentChunks).toEqual([1, 2]);
    expect(api.PUT.mock.calls[0][1].headers["Content-Type"]).toBe("application/octet-stream");
    expect(progress.at(-1)).toBe(file.size);
  });

  it("waits out a dropped connection and carries on", async () => {
    vi.useFakeTimers();
    try {
      api.POST.mockImplementation((path: string) =>
        path.endsWith("/complete/") ? ok({ id: "d1" }, 201) : ok(session, 201),
      );
      api.GET.mockImplementation(() => ok({ ...session, received: [0, 1] }));
      api.PUT.mockImplementationOnce(() => Promise.reject(new TypeError("Failed to fetch")));
      api.PUT.mockImplementation(() => ok({ received: [] }));
      const paused: boolean[] = [];
      const done = uploadResumable(file, "cv", { onProgress: (p) => paused.push(p.paused) });
      await vi.waitFor(() => expect(paused).toContain(true));
      await vi.advanceTimersByTimeAsync(5000);
      await expect(done).resolves.toMatchObject({ id: "d1" });
      // After the drop it asked which chunks arrived, and sent only the last.
      expect(api.GET).toHaveBeenCalled();
      expect(api.PUT.mock.calls.at(-1)?.[1].params.path.index).toBe(2);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("FactsStep", () => {
  let observed: Element[] = [];
  let trigger: (targets: Element[]) => void = () => undefined;

  beforeEach(() => {
    observed = [];
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        constructor(callback: (entries: { isIntersecting: boolean; target: Element }[]) => void) {
          trigger = (targets) =>
            callback(targets.map((target) => ({ isIntersecting: true, target })));
        }
        observe(element: Element) {
          observed.push(element);
        }
        disconnect() {}
      },
    );
  });
  afterEach(() => vi.unstubAllGlobals());

  const fact = (id: string, patch: Partial<ProfileFact> = {}): ProfileFact => ({
    id,
    kind: "work",
    data: { title: `Role ${id}`, employer: "Paystack" },
    status: "unconfirmed",
    origin: "extracted",
    source_document: { id: "d1", original_filename: "cv.pdf" },
    source_page: 1,
    source_excerpt: `Role ${id} at Paystack`,
    version: 1,
    viewed_at: null,
    confirmed_at: null,
    created_at: "2026-09-25T10:00:00Z",
    updated_at: "2026-09-25T10:00:00Z",
    ...patch,
  });

  it("unlocks 'Confirm remaining' only once every card has been seen", async () => {
    api.GET.mockImplementation((path: string) =>
      path.endsWith("/documents/") ? ok([]) : ok([fact("a"), fact("b", { viewed_at: null })]),
    );
    api.POST.mockImplementation(() => ok({ marked: 1 }));
    render(
      <QueryClientProvider client={makeQueryClient()}>
        <AnnouncerProvider>
          <FactsStep />
        </AnnouncerProvider>
      </QueryClientProvider>,
    );
    const confirm = await screen.findByRole("button", { name: "Confirm remaining (2)" });
    expect(confirm).toBeDisabled();
    expect(screen.getByText("0 of 2 confirmed")).toBeInTheDocument();

    act(() => trigger(observed.slice(0, 1)));
    expect(confirm).toBeDisabled();
    act(() => trigger(observed));
    expect(confirm).toBeEnabled();

    fireEvent.click(screen.getAllByRole("button", { name: "See source" })[0]);
    expect(screen.getAllByText("Role a at Paystack").length).toBeGreaterThan(0);
  });
});
