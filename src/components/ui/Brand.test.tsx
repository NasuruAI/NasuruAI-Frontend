import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BrandLockup, BrandMark } from "./Brand";

const LOGO_URL = "https://res.cloudinary.com/odpip1h9/image/upload/f_auto,q_auto/edu_logo";

describe("brand logo", () => {
  it("uses the supplied logo in the shared brand mark", () => {
    const { container } = render(<BrandMark />);
    const image = container.querySelector("img");

    expect(image).toHaveAttribute("src", expect.stringContaining(encodeURIComponent(LOGO_URL)));
    expect(image).toHaveAttribute("alt", "");
  });

  it("keeps the accessible brand name alongside the logo", () => {
    const { getByText } = render(<BrandLockup name="Nasuru AI" />);

    expect(getByText("Nasuru AI")).toBeInTheDocument();
  });
});
