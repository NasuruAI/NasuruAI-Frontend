import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AnnouncerProvider } from "@/components/ui/Announcer";
import {
  Button,
  Checkbox,
  Combobox,
  type ComboboxOption,
  ConfirmDialog,
  counterTone,
  OTPInput,
  phoneToE164Input,
  Popover,
  Stepper,
  Switch,
  Tabs,
  TextArea,
  TOAST_MS,
  ToastProvider,
  Uploader,
  useToast,
} from ".";

afterEach(() => {
  vi.useRealTimers();
});

describe("Button", () => {
  it("keeps its label while loading, and cannot be pressed twice", () => {
    const onClick = vi.fn();
    render(
      <Button loading onClick={onClick}>
        Prepare answers
      </Button>,
    );
    const button = screen.getByRole("button", { name: "Prepare answers" });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
    fireEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });
});

describe("TextArea counter", () => {
  it("turns warning at 90% and danger over the limit", () => {
    expect(counterTone(449, 500)).toBe("ok");
    expect(counterTone(450, 500)).toBe("warning");
    expect(counterTone(500, 500)).toBe("warning");
    expect(counterTone(501, 500)).toBe("danger");
  });

  it("says how far over the limit an answer is", () => {
    render(
      <TextArea label="Why Zalando?" maxChars={10} value={"x".repeat(13)} onChange={() => {}} />,
    );
    expect(screen.getByText(/13 \/ 10/)).toBeInTheDocument();
    expect(screen.getByText(/3 over the limit/)).toBeInTheDocument();
    expect(screen.getByLabelText("Why Zalando?")).toHaveAttribute("aria-invalid", "true");
  });
});

describe("phone numbers", () => {
  it("drops the local trunk zero after the dial code", () => {
    expect(phoneToE164Input({ dialCode: "+234", number: "0803 123 4567" })).toBe("+2348031234567");
    expect(phoneToE164Input({ dialCode: "+44", number: "7911-123-456" })).toBe("+447911123456");
  });
});

function OtpHarness({ onComplete }: { onComplete: (code: string) => void }) {
  const [code, setCode] = useState("");
  return <OTPInput value={code} onChange={setCode} onComplete={onComplete} />;
}

describe("OTPInput", () => {
  it("advances as digits are typed and completes on the sixth", async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();
    render(<OtpHarness onComplete={onComplete} />);
    await user.click(screen.getByLabelText("Digit 1 of 6"));
    await user.keyboard("123456");
    expect(onComplete).toHaveBeenCalledWith("123456");
    expect(screen.getByLabelText("Digit 6 of 6")).toHaveValue("6");
  });

  it("fills every cell from a pasted code", () => {
    const onComplete = vi.fn();
    render(<OtpHarness onComplete={onComplete} />);
    fireEvent.change(screen.getByLabelText("Digit 1 of 6"), { target: { value: "987654" } });
    expect(onComplete).toHaveBeenCalledWith("987654");
    expect(screen.getByLabelText("Digit 4 of 6")).toHaveValue("6");
  });

  it("goes back a cell on Backspace in an empty cell", async () => {
    const user = userEvent.setup();
    render(<OtpHarness onComplete={() => {}} />);
    await user.click(screen.getByLabelText("Digit 1 of 6"));
    await user.keyboard("12");
    await user.keyboard("{Backspace}");
    expect(screen.getByLabelText("Digit 2 of 6")).toHaveValue("");
    expect(screen.getByLabelText("Digit 2 of 6")).toHaveFocus();
  });
});

const OCCUPATIONS: ComboboxOption[] = [
  { value: "2425", label: "Data analyst", code: "SOC 2425" },
  { value: "2136", label: "Programmer", code: "SOC 2136" },
];

function ComboHarness({ search }: { search: (q: string) => Promise<ComboboxOption[]> }) {
  const [value, setValue] = useState<ComboboxOption | null>(null);
  return (
    <>
      <Combobox label="Your occupation" value={value} onChange={setValue} search={search} />
      <output>{value?.value ?? "none"}</output>
    </>
  );
}

describe("Combobox", () => {
  it("searches as you type and picks with the keyboard", async () => {
    const user = userEvent.setup();
    const search = vi.fn(async () => OCCUPATIONS);
    render(<ComboHarness search={search} />);
    await user.type(screen.getByRole("combobox", { name: "Your occupation" }), "data");
    await screen.findByRole("option", { name: /Data analyst/ });
    expect(search).toHaveBeenLastCalledWith("data");
    // The first option is active on arrival; ArrowDown moves to the second.
    await user.keyboard("{ArrowDown}{Enter}");
    expect(screen.getByText("2136")).toBeInTheDocument();
    expect(screen.getByRole("combobox")).toHaveValue("Programmer");
  });

  it("ignores a slow answer to an older query", async () => {
    const user = userEvent.setup();
    let resolveOld: (value: ComboboxOption[]) => void = () => {};
    const search = vi.fn((query: string) =>
      query === "da"
        ? new Promise<ComboboxOption[]>((resolve) => {
            resolveOld = resolve;
          })
        : Promise.resolve([OCCUPATIONS[1]]),
    );
    render(<ComboHarness search={search} />);
    const input = screen.getByRole("combobox");
    await user.type(input, "da");
    await waitFor(() => expect(search).toHaveBeenCalledWith("da"));
    await user.type(input, "tab");
    await screen.findByRole("option", { name: /Programmer/ });
    await act(async () => resolveOld([OCCUPATIONS[0]]));
    expect(screen.queryByRole("option", { name: /Data analyst/ })).not.toBeInTheDocument();
  });
});

function TabsHarness() {
  const [tab, setTab] = useState<"req" | "gaps" | "guide">("req");
  return (
    <Tabs
      label="Route detail"
      value={tab}
      onChange={setTab}
      tabs={[
        { value: "req", label: "Requirements" },
        { value: "gaps", label: "Gaps", count: 3 },
        { value: "guide", label: "Guide" },
      ]}
    />
  );
}

describe("Tabs", () => {
  it("moves with arrow keys and keeps only the active tab in the tab order", async () => {
    const user = userEvent.setup();
    render(<TabsHarness />);
    const first = screen.getByRole("tab", { name: "Requirements" });
    await user.click(first);
    await user.keyboard("{ArrowRight}");
    const gaps = screen.getByRole("tab", { name: /Gaps/ });
    expect(gaps).toHaveAttribute("aria-selected", "true");
    expect(gaps).toHaveFocus();
    expect(first).toHaveAttribute("tabindex", "-1");
    await user.keyboard("{End}");
    expect(screen.getByRole("tab", { name: "Guide" })).toHaveAttribute("aria-selected", "true");
    await user.keyboard("{ArrowRight}");
    expect(first).toHaveAttribute("aria-selected", "true"); // wraps
  });
});

function DialogHarness({ onConfirm }: { onConfirm: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Switch destination
      </button>
      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        onConfirm={onConfirm}
        title="Archive your Canada pipeline?"
        confirmLabel="Archive and switch"
        destructive
      />
    </>
  );
}

describe("ConfirmDialog", () => {
  it("opens as a modal, closes on Escape, and returns focus to the trigger", async () => {
    const user = userEvent.setup();
    render(<DialogHarness onConfirm={() => {}} />);
    const trigger = screen.getByRole("button", { name: "Switch destination" });
    await user.click(trigger);
    const dialog = screen.getByRole("dialog", { name: "Archive your Canada pipeline?" });
    expect(dialog).toHaveAttribute("open");
    fireEvent(dialog, new Event("cancel", { cancelable: true }));
    await waitFor(() => expect(dialog).not.toHaveAttribute("open"));
    expect(trigger).toHaveFocus();
  });

  it("names the destructive action", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(<DialogHarness onConfirm={onConfirm} />);
    await user.click(screen.getByRole("button", { name: "Switch destination" }));
    await user.click(screen.getByRole("button", { name: "Archive and switch" }));
    expect(onConfirm).toHaveBeenCalled();
  });
});

describe("Popover", () => {
  it("closes on Escape and gives focus back to its trigger", async () => {
    const user = userEvent.setup();
    render(
      <Popover
        label="Destination"
        trigger={(props) => (
          <button type="button" {...props}>
            Germany
          </button>
        )}
      >
        <button type="button">Compare all 7</button>
      </Popover>,
    );
    const trigger = screen.getByRole("button", { name: "Germany" });
    await user.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("button", { name: "Compare all 7" })).toHaveFocus();
    await user.keyboard("{Escape}");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(trigger).toHaveFocus();
  });
});

function ToastButton({ onUndo }: { onUndo: () => void }) {
  const toast = useToast();
  return (
    <button
      type="button"
      onClick={() => toast({ message: "To-do ticked", action: { label: "Undo", onClick: onUndo } })}
    >
      Tick
    </button>
  );
}

describe("Toast", () => {
  const renderToast = (onUndo = vi.fn()) =>
    render(
      <AnnouncerProvider>
        <ToastProvider>
          <ToastButton onUndo={onUndo} />
        </ToastProvider>
      </AnnouncerProvider>,
    );

  it("offers Undo and runs it", () => {
    const onUndo = vi.fn();
    renderToast(onUndo);
    fireEvent.click(screen.getByRole("button", { name: "Tick" }));
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(onUndo).toHaveBeenCalled();
    expect(screen.queryByText("To-do ticked")).not.toBeInTheDocument();
  });

  it("leaves after 5 seconds, but not while hovered", () => {
    vi.useFakeTimers();
    renderToast();
    fireEvent.click(screen.getByRole("button", { name: "Tick" }));
    const toast = screen.getByText("To-do ticked").closest("[role=status]") as HTMLElement;
    fireEvent.mouseEnter(toast);
    act(() => vi.advanceTimersByTime(TOAST_MS * 2));
    expect(screen.getByText("To-do ticked")).toBeInTheDocument();
    fireEvent.mouseLeave(toast);
    act(() => vi.advanceTimersByTime(TOAST_MS));
    expect(screen.queryByText("To-do ticked")).not.toBeInTheDocument();
  });
});

describe("Uploader", () => {
  it("refuses files over the limit and passes the rest on", () => {
    const onFiles = vi.fn();
    render(<Uploader label="Upload your CV" maxBytes={1024} items={[]} onFiles={onFiles} />);
    const input = screen.getByLabelText(/Upload your CV/);
    const small = new File(["cv"], "cv.pdf", { type: "application/pdf" });
    const big = new File(["x".repeat(2048)], "scan.pdf", { type: "application/pdf" });
    fireEvent.change(input, { target: { files: [small, big] } });
    expect(onFiles).toHaveBeenCalledWith([small]);
    expect(screen.getByRole("alert")).toHaveTextContent("scan.pdf is over 1 KB");
  });

  it("shows paused and failed states in words", () => {
    render(
      <Uploader
        label="Upload"
        onFiles={() => {}}
        onRetry={() => {}}
        items={[
          { id: "1", name: "cv.pdf", size: 4_200_000, type: "application/pdf", status: "paused" },
          {
            id: "2",
            name: "passport.jpg",
            size: 900_000,
            type: "image/jpeg",
            status: "failed",
            note: "The connection dropped.",
          },
        ]}
      />,
    );
    expect(screen.getByText(/Paused: waiting for a connection/)).toBeInTheDocument();
    expect(screen.getByText("The connection dropped.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Retry/ })).toBeInTheDocument();
  });
});

describe("choice controls", () => {
  it("sets the native indeterminate state on a checkbox", () => {
    render(<Checkbox label="Select all" checked={false} indeterminate onChange={() => {}} />);
    expect(
      (screen.getByRole("checkbox", { name: "Select all" }) as HTMLInputElement).indeterminate,
    ).toBe(true);
  });

  it("reports a switch as a switch", () => {
    const onChange = vi.fn();
    render(<Switch label="Job alerts" checked={false} onChange={onChange} />);
    fireEvent.click(screen.getByRole("switch", { name: "Job alerts" }));
    expect(onChange).toHaveBeenCalledWith(true);
  });
});

describe("Stepper", () => {
  it("says where you are and how long is left", () => {
    render(<Stepper steps={["Welcome", "Upload", "Questions"]} current={1} minutesLeft={6} />);
    expect(screen.getByText("Step 2 of 3")).toBeInTheDocument();
    expect(screen.getByText(/about 6 minutes left/)).toBeInTheDocument();
    expect(screen.getByText(/Upload/).closest("li")).toHaveAttribute("aria-current", "step");
  });
});
