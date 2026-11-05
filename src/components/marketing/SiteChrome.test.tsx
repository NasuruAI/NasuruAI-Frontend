import { render, screen } from "@testing-library/react";
import type { AnchorHTMLAttributes } from "react";
import { describe, expect, it, vi } from "vitest";
import { SiteHeader } from "./SiteChrome";

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe("SiteHeader", () => {
  it("shows a prominent Programs link to the public catalogue", () => {
    render(<SiteHeader />);

    const programsLink = screen.getByRole("link", { name: "Programs" });
    expect(programsLink).toHaveAttribute("href", "/ai/programs");
    expect(programsLink).toHaveClass("bg-accent-soft");
  });
});
