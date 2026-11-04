import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AnnouncerProvider } from "@/components/ui/Announcer";
import { ApiError } from "@/lib/api";
import { login } from "@/lib/auth/client";
import LoginPage from "./page";

const { push, refresh } = vi.hoisted(() => ({
  push: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

vi.mock("@/lib/auth/client", () => ({
  login: vi.fn(),
}));

vi.mock("@/lib/auth/SessionProvider", () => ({
  useSession: () => ({ refresh }),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("LoginPage", () => {
  it("keeps the password visibility toggle available while the field is empty", () => {
    render(
      <AnnouncerProvider>
        <LoginPage />
      </AnnouncerProvider>,
    );

    const password = screen.getByLabelText("Password");
    expect(password).toHaveAttribute("type", "password");
    fireEvent.click(screen.getByRole("button", { name: "Show password" }));
    expect(password).toHaveAttribute("type", "text");
    expect(screen.getByRole("button", { name: "Hide password" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("shows the backend detail in an error toast", async () => {
    vi.mocked(login).mockRejectedValueOnce(
      new ApiError("Invalid email or password.", 401, {}, "invalid_credentials"),
    );

    render(
      <AnnouncerProvider>
        <LoginPage />
      </AnnouncerProvider>,
    );

    fireEvent.change(screen.getByLabelText("Email address"), {
      target: { value: "person@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "wrong-password" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => {
      expect(screen.getByText("Invalid email or password.")).toBeInTheDocument();
    });
  });
});
