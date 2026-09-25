import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AnnouncerProvider } from "@/components/ui/Announcer";
import { ApiError } from "@/lib/api";
import * as auth from "@/lib/ai/auth";
import { displayPhone, formatWait, retryAt } from "@/lib/ai/auth";
import { EmailSignIn } from "./EmailForms";
import { PhoneFlow } from "./PhoneFlow";
import { aiNext } from "./useSignedIn";

vi.mock("@/lib/ai/auth", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/ai/auth")>()),
  requestPhoneCode: vi.fn(),
  verifyPhoneCode: vi.fn(),
  emailSignIn: vi.fn(),
}));

const requestPhoneCode = vi.mocked(auth.requestPhoneCode);
const verifyPhoneCode = vi.mocked(auth.verifyPhoneCode);
const emailSignIn = vi.mocked(auth.emailSignIn);

const NOW = new Date("2026-09-25T10:00:00Z");
const sent = (channel: auth.Channel = "sms"): auth.CodeSent => ({
  channel,
  expires_at: new Date(NOW.getTime() + 600_000).toISOString(),
  whatsapp_available_at: new Date(NOW.getTime() + 60_000).toISOString(),
});
const user = { id: "u1", first_name: "Emeka" } as auth.SignedIn["user"];

beforeEach(() => {
  vi.useFakeTimers({ now: NOW, toFake: ["Date", "setInterval", "clearInterval"] });
});
afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

function renderFlow() {
  const onSignedIn = vi.fn();
  render(
    <AnnouncerProvider>
      <PhoneFlow onSignedIn={onSignedIn} />
    </AnnouncerProvider>,
  );
  return onSignedIn;
}

async function toCodeStep() {
  requestPhoneCode.mockResolvedValueOnce(sent());
  fireEvent.change(screen.getByLabelText("Mobile number"), {
    target: { value: "0803 123 4567" },
  });
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Send code" }));
  });
}

async function enterCode(code = "123456") {
  await act(async () => {
    fireEvent.change(screen.getByLabelText("Digit 1 of 6"), { target: { value: code } });
  });
}

describe("helpers", () => {
  it("formats waits, Nigerian numbers and retry times", () => {
    expect(formatWait(42_000)).toBe("0:42");
    expect(formatWait(725_400)).toBe("12:06");
    expect(formatWait(-5)).toBe("0:00");
    expect(displayPhone("+2348031234567")).toBe("+234 803 123 4567");
    expect(displayPhone("+447700900123")).toBe("+447700900123");
    const error = new ApiError("Too many", 429, { retry_at: ["2026-09-25T11:00:00Z"] }, "x");
    expect(retryAt(error)?.toISOString()).toBe("2026-09-25T11:00:00.000Z");
    expect(retryAt(new Error("no"))).toBeNull();
  });

  it("only follows ?next= to a Nasuru AI page", () => {
    expect(aiNext("?next=%2Fai%2Fjobs%3Fq%3Ddata")).toBe("/ai/jobs?q=data");
    expect(aiNext("?next=%2Fstaff")).toBe("/ai/plan");
    expect(aiNext("?next=https%3A%2F%2Fevil.example")).toBe("/ai/plan");
    expect(aiNext("")).toBe("/ai/plan");
  });
});

describe("PhoneFlow", () => {
  it("sends the number as typed after +234, then asks for the code", async () => {
    renderFlow();
    await toCodeStep();
    expect(requestPhoneCode).toHaveBeenCalledWith("+2348031234567", "sms");
    expect(screen.getByRole("heading", { name: "Enter your code" })).toHaveFocus();
    expect(screen.getByText("+234 803 123 4567")).toBeInTheDocument();
  });

  it("signs in once all six digits are in", async () => {
    const onSignedIn = renderFlow();
    await toCodeStep();
    verifyPhoneCode.mockResolvedValueOnce({ user, created: false });
    await enterCode();
    expect(verifyPhoneCode).toHaveBeenCalledWith({ phone: "+2348031234567", code: "123456" });
    expect(onSignedIn).toHaveBeenCalledWith({ user, created: false });
  });

  it("clears a wrong code and says so", async () => {
    renderFlow();
    await toCodeStep();
    verifyPhoneCode.mockRejectedValueOnce(
      new ApiError("That code isn't right or has expired.", 400, {}, "invalid_code"),
    );
    await enterCode();
    expect(screen.getByText("That code isn't right or has expired.")).toBeInTheDocument();
    expect(screen.getByLabelText("Digit 1 of 6")).toHaveValue("");
  });

  it("asks a new number for a name and the terms, then creates the account", async () => {
    const onSignedIn = renderFlow();
    await toCodeStep();
    verifyPhoneCode.mockRejectedValueOnce(new ApiError("Accept", 400, {}, "terms_required"));
    await enterCode();
    expect(screen.getByRole("heading", { name: "You're new here" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Create account" }));
    expect(screen.getByText("Enter your first name.")).toBeInTheDocument();
    expect(screen.getByText(/Tick the box/)).toBeInTheDocument();
    expect(verifyPhoneCode).toHaveBeenCalledTimes(1);

    fireEvent.change(screen.getByLabelText("First name"), { target: { value: " Emeka " } });
    fireEvent.click(screen.getByRole("checkbox"));
    verifyPhoneCode.mockResolvedValueOnce({ user, created: true });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Create account" }));
    });
    expect(verifyPhoneCode).toHaveBeenLastCalledWith({
      phone: "+2348031234567",
      code: "123456",
      accept_terms: true,
      first_name: "Emeka",
      last_name: "",
    });
    expect(onSignedIn).toHaveBeenCalledWith({ user, created: true });
  });

  it("offers WhatsApp only once the SMS has had a minute", async () => {
    renderFlow();
    await toCodeStep();
    expect(screen.queryByRole("button", { name: "Send on WhatsApp" })).not.toBeInTheDocument();
    expect(screen.getByText("1:00")).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    requestPhoneCode.mockResolvedValueOnce(sent("whatsapp"));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Send on WhatsApp" }));
    });
    expect(requestPhoneCode).toHaveBeenLastCalledWith("+2348031234567", "whatsapp");
    expect(screen.getByText(/We sent a 6-digit code on WhatsApp/)).toBeInTheDocument();
  });

  it("says when a number that asked too often can try again", async () => {
    renderFlow();
    requestPhoneCode.mockRejectedValueOnce(
      new ApiError(
        "Too many codes for this number. You can ask again at 11:00.",
        429,
        { retry_at: [new Date(NOW.getTime() + 125_000).toISOString()] },
        "too_many_codes",
      ),
    );
    fireEvent.change(screen.getByLabelText("Mobile number"), { target: { value: "8031234567" } });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Send code" }));
    });
    expect(screen.getByRole("alert")).toHaveTextContent("Try again in 2:05");
    expect(screen.getByRole("button", { name: "Send code" })).toBeDisabled();
  });

  it("shows a bad number against the field", async () => {
    renderFlow();
    requestPhoneCode.mockRejectedValueOnce(
      new ApiError("Enter a valid mobile number.", 400, {}, "invalid_phone"),
    );
    fireEvent.change(screen.getByLabelText("Mobile number"), { target: { value: "123" } });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Send code" }));
    });
    expect(screen.getByLabelText("Mobile number")).toHaveAttribute("aria-invalid", "true");
  });
});

describe("EmailSignIn", () => {
  it("asks for the authenticator code when the account has two-factor on", async () => {
    const onSignedIn = vi.fn();
    render(<EmailSignIn onSignedIn={onSignedIn} />);
    fireEvent.change(screen.getByLabelText("Email address"), { target: { value: "a@b.ng" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "long-password" } });
    emailSignIn.mockRejectedValueOnce(new ApiError("Enter the code", 401, {}, "mfa_required"));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
    });
    expect(screen.getByText(/authenticator app/)).toBeInTheDocument();

    emailSignIn.mockResolvedValueOnce({ user, created: false });
    await act(async () => {
      fireEvent.change(screen.getByLabelText("Digit 1 of 6"), { target: { value: "654321" } });
    });
    expect(emailSignIn).toHaveBeenLastCalledWith({
      email: "a@b.ng",
      password: "long-password",
      otp: "654321",
    });
    expect(onSignedIn).toHaveBeenCalled();
  });
});
