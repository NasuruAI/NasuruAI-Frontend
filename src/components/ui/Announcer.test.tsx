import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { apiErrorFrom } from "@/lib/api";
import { AnnouncerProvider } from "./Announcer";

afterEach(() => {
  vi.useRealTimers();
});

describe("API error toasts", () => {
  it("shows the backend detail in a site-wide error toast", () => {
    render(
      <AnnouncerProvider>
        <p>Page content</p>
      </AnnouncerProvider>,
    );

    act(() => {
      apiErrorFrom(401, {
        detail: "Invalid email or password.",
        code: "invalid_credentials",
      });
    });

    expect(screen.getByText("Invalid email or password.")).toBeInTheDocument();
  });

  it("does not toast expected MFA step-up responses", () => {
    render(
      <AnnouncerProvider>
        <p>Page content</p>
      </AnnouncerProvider>,
    );

    act(() => {
      apiErrorFrom(401, {
        detail: "Enter the code from your authenticator app.",
        code: "mfa_required",
      });
    });

    expect(
      screen.queryByText("Enter the code from your authenticator app."),
    ).not.toBeInTheDocument();
  });

  it("automatically dismisses error toasts after five seconds", () => {
    vi.useFakeTimers();
    render(
      <AnnouncerProvider>
        <p>Page content</p>
      </AnnouncerProvider>,
    );

    act(() => {
      apiErrorFrom(400, { detail: "No payment gateway is active for NGN." });
    });

    const dismissButton = () =>
      screen.getByRole("button", {
        name: "Dismiss: No payment gateway is active for NGN.",
      });
    expect(dismissButton()).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(4999));
    expect(dismissButton()).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(1));
    expect(
      screen.queryByRole("button", { name: "Dismiss: No payment gateway is active for NGN." }),
    ).not.toBeInTheDocument();
  });
});
