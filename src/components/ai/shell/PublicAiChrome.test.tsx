import { render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PublicAiChrome } from "./PublicAiChrome";

const { pathname } = vi.hoisted(() => ({ pathname: "/ai/programs" }));

vi.mock("next/navigation", () => ({
  usePathname: () => pathname,
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

afterEach(() => {
  vi.clearAllMocks();
});

describe("PublicAiChrome", () => {
  it("shows a Programs link to the public catalogue on AI public pages", () => {
    render(
      <PublicAiChrome>
        <main>Catalogue</main>
      </PublicAiChrome>,
    );

    const navigation = screen.getByRole("navigation", { name: "Main" });
    const programsLink = within(navigation).getByRole("link", { name: "Programs" });
    expect(programsLink).toHaveAttribute("href", "/ai/programs");
  });
});
