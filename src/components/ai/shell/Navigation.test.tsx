import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { BottomTabs, NavRail } from "./Navigation";

vi.mock("next/navigation", () => ({
  usePathname: () => "/ai/jobs/saved",
}));

vi.mock("@/lib/ai/shell", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/ai/shell")>();
  return { ...original, useEntitlements: () => ({ data: undefined }) };
});

describe("desktop module navigation", () => {
  it("expands the active module and switches dropdowns", async () => {
    const user = userEvent.setup();
    render(<NavRail />);

    const workModule = screen.getByRole("button", { name: "Find work" });
    const studyModule = screen.getByRole("button", { name: "Explore study" });
    expect(workModule).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("link", { name: "Saved jobs" })).toHaveAttribute(
      "aria-current",
      "page",
    );

    await user.click(studyModule);
    expect(workModule).toHaveAttribute("aria-expanded", "false");
    expect(studyModule).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("link", { name: "Scholarships" })).toBeInTheDocument();
  });
});

describe("mobile module navigation", () => {
  it("opens a module dropdown, marks the current page and closes with Escape", async () => {
    const user = userEvent.setup();
    render(<BottomTabs />);

    const workModule = screen.getByRole("button", { name: "Find work" });
    expect(workModule).toHaveAttribute("aria-expanded", "false");
    await user.click(workModule);

    expect(workModule).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("region", { name: "Find work" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Saved jobs" })).toHaveAttribute(
      "aria-current",
      "page",
    );

    fireEvent.keyDown(document, { key: "Escape" });
    expect(workModule).toHaveAttribute("aria-expanded", "false");
    expect(workModule).toHaveFocus();
  });
});
