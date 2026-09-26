import { QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ai } from "@/lib/ai/client";
import { cvContent, letterContent } from "@/lib/ai/cv";
import { makeQueryClient } from "@/lib/ai/QueryProvider";
import { CvEditorView } from "./CvEditorView";
import { CvStudioView } from "./CvStudioView";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: vi.fn() }),
  usePathname: () => "/ai/cv",
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
  return <QueryClientProvider client={makeQueryClient()}>{children}</QueryClientProvider>;
}

const bullet = (id: string, text: string, patch: Partial<Record<string, unknown>> = {}) => ({
  id,
  text,
  included: true,
  flagged: false,
  tightening: false,
  tightenings_left: 3,
  has_original: false,
  ...patch,
});

const cv = {
  id: "d1",
  kind: "cv" as const,
  kind_label: "CV",
  country: "GB",
  format_title: "CV",
  job: null,
  job_title: "",
  include_personal_details: false,
  profile_version: 1,
  status: "ready",
  pages: 1,
  over_length: false,
  flagged: false,
  guidance: "",
  pdf_url: "/x.pdf",
  docx_url: "/x.docx",
  task_id: null,
  error: "",
  error_code: "",
  created_at: "2026-09-26T09:00:00Z",
  content: {
    kind: "cv" as const,
    format: "gb",
    title: "CV",
    headings: {
      profile: "Profile",
      experience: "Experience",
      education: "Education",
      skills: "Skills",
    },
    tabular: false,
    name: "Chidinma Okafor",
    contact: ["chidinma@example.com"],
    town: "",
    personal: [],
    summary: "A data analyst.",
    experience: [
      {
        title: "Data Analyst",
        employer: "First Bank",
        place: "Lagos",
        dates: "2019 – now",
        bullets: [
          bullet("b1", "Prepared monthly board packs"),
          bullet("b2", "Built SQL reporting for branch performance"),
          bullet("b3", "Trained new staff"),
        ],
      },
    ],
    education: [
      {
        qualification: "B.Sc. Statistics",
        institution: "University of Lagos",
        dates: "2016",
        detail: "",
      },
    ],
    skills: ["SQL", "Python"],
    certifications: [],
    languages: [],
    place_and_date: "",
    section_order: ["summary", "experience", "education", "skills", "certifications", "languages"],
  },
};

const letter = {
  ...cv,
  id: "d2",
  kind: "cover_letter" as const,
  kind_label: "Cover letter",
  job: "j1",
  job_title: "Data Analyst",
  content: {
    kind: "cover_letter" as const,
    format: "gb",
    name: "Chidinma Okafor",
    contact: ["chidinma@example.com"],
    date: "25 September 2026",
    recipient: "Acme Ltd",
    subject: "Application: Data Analyst",
    salutation: "Dear Hiring Manager,",
    paragraphs: ["First paragraph.", "Second paragraph."],
    closing: "Yours sincerely,",
  },
};

describe("cv content helpers", () => {
  it("narrows a document's content by its kind", () => {
    expect(cvContent(cv)?.summary).toBe("A data analyst.");
    expect(cvContent(letter)).toBeNull();
    expect(letterContent(letter)?.recipient).toBe("Acme Ltd");
    expect(letterContent(cv)).toBeNull();
  });
});

describe("CvStudioView", () => {
  function studioApi(documents: unknown[] = []) {
    api.GET.mockImplementation((path: string) => {
      if (path === "/api/ai/v1/me/generated-documents/formats/") {
        return ok([
          {
            country: "GB",
            country_name: "United Kingdom",
            code: "gb",
            title: "CV",
            pages: 2,
            paper: "A4",
            rules: ["No photo"],
          },
          {
            country: "DE",
            country_name: "Germany",
            code: "de",
            title: "Lebenslauf",
            pages: 2,
            paper: "A4",
            rules: ["Photo optional"],
          },
        ]);
      }
      if (path === "/api/ai/v1/me/generated-documents/") return ok(documents);
      if (path === "/api/ai/v1/me/") return ok({ destination: "GB" });
      return ok({});
    });
  }

  it("offers to make a master CV for a country with none yet, and links to one that exists", async () => {
    studioApi([cv]);
    render(wrap(<CvStudioView />));
    await screen.findByText("United Kingdom");
    expect(screen.getByRole("link", { name: "Open" })).toHaveAttribute("href", "/ai/cv/d1");
    expect(screen.getByRole("button", { name: /Make/ })).toBeInTheDocument();
  });

  it("makes a master CV for the chosen country", async () => {
    studioApi([]);
    api.POST.mockImplementation(() => ok({ id: "new" }, 202));
    render(wrap(<CvStudioView />));
    await screen.findByText("Germany");
    const germanRow = screen.getByText("Germany").closest("li")!;
    fireEvent.click(within(germanRow).getByRole("button", { name: "Make" }));
    await waitFor(() => expect(api.POST).toHaveBeenCalled());
    expect(api.POST.mock.calls[0][1].body).toMatchObject({ kind: "cv", job: null, country: "DE" });
  });

  it("lists tailored documents, and shows an empty state without any", async () => {
    studioApi([]);
    render(wrap(<CvStudioView />));
    expect(await screen.findByText("Nothing tailored yet")).toBeInTheDocument();

    studioApi([letter]);
    render(wrap(<CvStudioView />));
    expect(await screen.findByText("Cover letter for Data Analyst")).toBeInTheDocument();
  });
});

function editorApi(document: unknown, formats: unknown[] = []) {
  api.GET.mockImplementation((path: string) => {
    if (path === "/api/ai/v1/me/generated-documents/{document_id}/") return ok(document);
    if (path === "/api/ai/v1/me/generated-documents/formats/") return ok(formats);
    return ok({});
  });
}

describe("CvEditorView: a CV", () => {
  it("shows the sections in order, with each bullet's state", async () => {
    editorApi(cv, [
      {
        country: "GB",
        country_name: "GB",
        code: "gb",
        title: "CV",
        pages: 2,
        paper: "A4",
        rules: ["No photo"],
      },
    ]);
    render(wrap(<CvEditorView id="d1" />));
    expect(await screen.findByRole("heading", { name: "Master CV" })).toBeInTheDocument();
    expect(screen.getByText("No photo")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Prepared monthly board packs" })).toBeChecked();
    expect(screen.getByRole("heading", { name: "Section order" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Education", level: 2 })).toBeInTheDocument();
    expect(screen.getAllByText(/Edit in your facts/)[0].closest("a")).toHaveAttribute(
      "href",
      "/ai/start/facts",
    );
  });

  it("toggles a bullet on and off", async () => {
    editorApi(cv);
    api.POST.mockImplementation(() =>
      ok({
        ...cv,
        content: {
          ...cv.content,
          experience: [
            {
              ...cv.content.experience[0],
              bullets: [
                { ...cv.content.experience[0].bullets[0], included: false },
                ...cv.content.experience[0].bullets.slice(1),
              ],
            },
          ],
        },
      }),
    );
    render(wrap(<CvEditorView id="d1" />));
    const checkbox = await screen.findByRole("checkbox", { name: "Prepared monthly board packs" });
    fireEvent.click(checkbox);
    await waitFor(() => expect(api.POST).toHaveBeenCalled());
    expect(api.POST.mock.calls[0][0]).toBe(
      "/api/ai/v1/me/generated-documents/{document_id}/bullets/{bullet_id}/toggle/",
    );
    expect(api.POST.mock.calls[0][1].params.path).toEqual({ document_id: "d1", bullet_id: "b1" });
  });

  it("moves a bullet down within its role", async () => {
    editorApi(cv);
    api.PATCH.mockImplementation(() => ok(cv));
    render(wrap(<CvEditorView id="d1" />));
    await screen.findByRole("checkbox", { name: "Prepared monthly board packs" });
    fireEvent.click(
      screen.getByRole("button", { name: "Move down: Prepared monthly board packs" }),
    );
    await waitFor(() => expect(api.PATCH).toHaveBeenCalled());
    expect(api.PATCH.mock.calls[0][0]).toBe(
      "/api/ai/v1/me/generated-documents/{document_id}/roles/{role_index}/bullets/",
    );
    expect(api.PATCH.mock.calls[0][1].body).toEqual({ order: ["b2", "b1", "b3"] });
  });

  it("moves a section, reordering the editor to match", async () => {
    editorApi(cv);
    api.PATCH.mockImplementation(() => ok(cv));
    render(wrap(<CvEditorView id="d1" />));
    await screen.findByRole("heading", { name: "Section order" });
    fireEvent.click(screen.getByRole("button", { name: "Move Profile down" }));
    await waitFor(() => expect(api.PATCH).toHaveBeenCalled());
    expect(api.PATCH.mock.calls[0][0]).toBe(
      "/api/ai/v1/me/generated-documents/{document_id}/sections/",
    );
    expect(api.PATCH.mock.calls[0][1].body).toEqual({
      order: ["experience", "summary", "education", "skills", "certifications", "languages"],
    });
  });

  it("tightens a bullet, then can compare with and restore the original", async () => {
    const tightened = {
      ...cv,
      content: {
        ...cv.content,
        experience: [
          {
            ...cv.content.experience[0],
            bullets: [
              bullet("b1", "Prepared monthly board packs", {
                has_original: true,
                tightenings_left: 2,
              }),
              ...cv.content.experience[0].bullets.slice(1),
            ],
          },
        ],
      },
    };
    editorApi(cv);
    api.POST.mockImplementation(() => ok(tightened, 202));
    render(wrap(<CvEditorView id="d1" />));
    const checkbox = await screen.findByRole("checkbox", { name: "Prepared monthly board packs" });
    const row = checkbox.closest("li")!;
    fireEvent.click(within(row).getByRole("button", { name: /Tighten this bullet/ }));
    await waitFor(() => expect(api.POST).toHaveBeenCalled());
    expect(api.POST.mock.calls[0][0]).toBe(
      "/api/ai/v1/me/generated-documents/{document_id}/bullets/{bullet_id}/tighten/",
    );
    const compare = await within(row).findByRole("button", { name: "Compare with the original" });
    fireEvent.click(compare);
    expect(within(row).getByText("Before tightening it said:")).toBeInTheDocument();

    api.POST.mockImplementation(() => ok(cv));
    fireEvent.click(within(row).getByRole("button", { name: "Restore this wording" }));
    await waitFor(() =>
      expect(api.POST.mock.calls.at(-1)?.[0]).toBe(
        "/api/ai/v1/me/generated-documents/{document_id}/bullets/{bullet_id}/restore/",
      ),
    );
  });

  it("edits the profile summary", async () => {
    editorApi(cv);
    api.PATCH.mockImplementation(() =>
      ok({ ...cv, content: { ...cv.content, summary: "New summary." } }),
    );
    render(wrap(<CvEditorView id="d1" />));
    const box = await screen.findByLabelText("Profile summary");
    fireEvent.change(box, { target: { value: "New summary." } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(api.PATCH).toHaveBeenCalled());
    expect(api.PATCH.mock.calls[0][0]).toBe(
      "/api/ai/v1/me/generated-documents/{document_id}/text/",
    );
    expect(api.PATCH.mock.calls[0][1].body).toEqual({ value: "New summary." });
  });

  it("deletes the document after confirming", async () => {
    editorApi(cv);
    api.DELETE.mockImplementation(() => ok(null, 204));
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(wrap(<CvEditorView id="d1" />));
    fireEvent.click(await screen.findByRole("button", { name: "Delete" }));
    await waitFor(() => expect(api.DELETE).toHaveBeenCalled());
    expect(push).toHaveBeenCalledWith("/ai/cv");
  });

  it("says when it isn't ready yet", async () => {
    editorApi({ ...cv, status: "queued", content: null });
    render(wrap(<CvEditorView id="d1" />));
    expect(await screen.findByText("This document isn't ready")).toBeInTheDocument();
    expect(screen.getByText(/still being written/)).toBeInTheDocument();
  });
});

describe("CvEditorView: a cover letter", () => {
  it("edits the body as paragraphs split on a blank line", async () => {
    editorApi(letter);
    api.PATCH.mockImplementation(() =>
      ok({ ...letter, content: { ...letter.content, paragraphs: ["A.", "B."] } }),
    );
    render(wrap(<CvEditorView id="d2" />));
    expect(
      await screen.findByRole("heading", { name: "Cover letter for Data Analyst" }),
    ).toBeInTheDocument();
    const box = screen.getByLabelText("The letter's body");
    expect(box).toHaveValue("First paragraph.\n\nSecond paragraph.");
    fireEvent.change(box, { target: { value: "A.\n\nB." } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(api.PATCH).toHaveBeenCalled());
    expect(api.PATCH.mock.calls[0][1].body).toEqual({ value: "A.\n\nB." });
    expect(screen.queryByRole("heading", { name: "Section order" })).not.toBeInTheDocument();
  });
});
