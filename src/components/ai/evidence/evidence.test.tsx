import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AnnouncerProvider } from "@/components/ui/Announcer";
import {
  AnswerRow,
  COPIED_MS,
  CheckList,
  CostBreakdown,
  DocumentCard,
  PointsBreakdown,
  QuotaMeter,
  ScamVerdict,
  SourceLine,
  StatusPill,
  TrustMeter,
  costTotals,
  countdownTone,
  daysBetween,
  formatNaira,
  isStale,
  relativeDays,
  trustBand,
  type Answer,
  type CostLine,
} from ".";

afterEach(() => vi.useRealTimers());

describe("format", () => {
  it("writes naira in full and short", () => {
    expect(formatNaira(1_450_000)).toBe("₦1,450,000");
    expect(formatNaira(1_450_000, { short: true })).toBe("₦1.45m");
    expect(formatNaira(950_000, { short: true })).toBe("₦950k");
    expect(formatNaira(2_000_000_000, { short: true })).toBe("₦2bn");
    expect(formatNaira(4_500, { short: true })).toBe("₦4,500");
    expect(formatNaira(-30_000)).toBe("−₦30,000");
  });

  it("counts calendar days, not 24-hour spans", () => {
    const from = new Date(2026, 8, 25, 23, 30);
    expect(daysBetween(new Date(2026, 8, 26, 0, 10), from)).toBe(1);
    expect(daysBetween(new Date(2026, 8, 22), from)).toBe(-3);
    expect(relativeDays(0)).toBe("today");
    expect(relativeDays(1)).toBe("tomorrow");
    expect(relativeDays(-1)).toBe("yesterday");
    expect(relativeDays(9)).toBe("in 9 days");
    expect(relativeDays(-3)).toBe("3 days ago");
  });
});

describe("thresholds", () => {
  it("tones a countdown by the days left", () => {
    expect(countdownTone(30)).toBe("neutral");
    expect(countdownTone(14)).toBe("warning");
    expect(countdownTone(4)).toBe("warning");
    expect(countdownTone(3)).toBe("danger");
    expect(countdownTone(0)).toBe("danger");
    expect(countdownTone(-1)).toBe("neutral");
  });

  it("bands a trust score and hides the meter below 40", () => {
    expect(trustBand(80)).toBe("high");
    expect(trustBand(79)).toBe("verified");
    expect(trustBand(60)).toBe("verified");
    expect(trustBand(40)).toBe("caution");
    expect(trustBand(39)).toBeNull();
    const { container } = render(<TrustMeter score={20} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("treats a source past its re-check date as stale", () => {
    const now = new Date("2026-09-25");
    expect(isStale({ name: "UKVI", recheckAfter: "2026-09-01" }, now)).toBe(true);
    expect(isStale({ name: "UKVI", recheckAfter: "2026-10-01" }, now)).toBe(false);
    expect(isStale({ name: "UKVI", stale: true }, now)).toBe(true);
    render(<SourceLine source={{ name: "UKVI", stale: true }} />);
    expect(screen.getByText(/awaiting re-check/)).toBeInTheDocument();
  });
});

describe("status", () => {
  it("says 'Not eligible yet', never a final no", () => {
    render(<StatusPill status="not_eligible" />);
    expect(screen.getByText("Not eligible yet")).toBeInTheDocument();
  });

  it("reports quota as a meter", () => {
    render(<QuotaMeter used={2} limit={3} noun="answer packs" />);
    const meter = screen.getByRole("meter", { name: "2 of 3 answer packs this month" });
    expect(meter).toHaveAttribute("aria-valuenow", "2");
    expect(meter).toHaveAttribute("aria-valuemax", "3");
  });

  it("says when the quota is used up", () => {
    render(<QuotaMeter used={3} limit={3} noun="answer packs" />);
    expect(screen.getByText(/you've used them all/)).toBeInTheDocument();
  });
});

describe("trust", () => {
  it("lists failed checks first", () => {
    render(
      <CheckList
        checks={[
          { name: "Company registered", outcome: "pass", evidence: "Companies House" },
          { name: "Sponsor licence", outcome: "unknown", evidence: "Not listed yet" },
          { name: "Asks for a fee", outcome: "fail", evidence: "£450 'processing fee'" },
        ]}
      />,
    );
    const names = screen.getAllByRole("listitem").map((item) => item.textContent);
    expect(names[0]).toMatch(/^Asks for a fee: Failed/);
    expect(names[1]).toMatch(/^Sponsor licence: Not known yet/);
    expect(names[2]).toMatch(/^Company registered: Passed/);
  });

  it("gives report routes only for a likely scam, from props", () => {
    const routes = [{ label: "Report to the EFCC", href: "https://efcc.gov.ng/report" }];
    const { rerender } = render(
      <ScamVerdict
        verdict="scam"
        summary="Asks for money up front."
        checks={[]}
        reportRoutes={routes}
      />,
    );
    expect(screen.getByRole("heading", { name: "Likely scam" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Report to the EFCC/ })).toHaveAttribute(
      "href",
      "https://efcc.gov.ng/report",
    );
    rerender(
      <ScamVerdict
        verdict="genuine"
        summary="All checks passed."
        checks={[]}
        reportRoutes={routes}
      />,
    );
    expect(screen.queryByRole("link", { name: /EFCC/ })).not.toBeInTheDocument();
    expect(screen.queryByText("What to do now")).not.toBeInTheDocument();
  });
});

describe("money", () => {
  const lines: CostLine[] = [
    { kind: "tuition", label: "Tuition", naira: 20_000_000 },
    { kind: "visa", label: "Visa fee", naira: 1_000_000 },
    { kind: "proof_of_funds", label: "Proof of funds", naira: 15_000_000 },
  ];

  it("leaves proof of funds out of what you spend", () => {
    expect(costTotals(lines)).toEqual({ spent: 21_000_000, shown: 15_000_000 });
    render(<CostBreakdown lines={lines} />);
    expect(screen.getByText("₦21,000,000")).toBeInTheDocument();
    expect(screen.getByText(/leaves out ₦15,000,000 of proof of funds/)).toBeInTheDocument();
  });

  it("totals points and states the gap to the threshold", () => {
    render(
      <PointsBreakdown
        scheme="Express Entry CRS"
        factors={[
          { label: "Age", points: 110 },
          { label: "Education", points: 120 },
          { label: "Language", points: 200 },
        ]}
        threshold={{ points: 470, label: "the last draw" }}
        whatIfs={[{ label: "you score CLB 9 in French", delta: 50 }]}
      />,
    );
    expect(screen.getByText("430")).toBeInTheDocument();
    expect(screen.getByText("40 below the last draw")).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "What would add points" })).toHaveTextContent("+50");
  });
});

describe("DocumentCard", () => {
  it("warns before a document expires, and says when it has", () => {
    vi.useFakeTimers({ now: new Date(2026, 8, 25) });
    const { rerender } = render(
      <DocumentCard
        kindLabel="Passport"
        name="Nigerian passport"
        expiresOn="2027-03-25"
        warnDays={365}
      />,
    );
    expect(screen.getByText(/months left/)).toBeInTheDocument();
    rerender(<DocumentCard kindLabel="Passport" name="Nigerian passport" expiresOn="2026-09-01" />);
    expect(screen.getByText(/^Expired/)).toBeInTheDocument();
  });
});

describe("AnswerRow", () => {
  const written: Answer = {
    id: "a1",
    label: "Why this role?",
    fieldType: "Long text",
    kind: "written",
    answer: "I have run payments for 4 years.",
    maxChars: 500,
  };

  function renderRow(answer: Answer, props: Partial<React.ComponentProps<typeof AnswerRow>> = {}) {
    return render(
      <AnnouncerProvider>
        <AnswerRow answer={answer} {...props} />
      </AnnouncerProvider>,
    );
  }

  it("copies the answer and resets the tick after 2 s", async () => {
    vi.useFakeTimers();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    renderRow(written);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Copy" }));
    });
    expect(writeText).toHaveBeenCalledWith(written.answer);
    expect(screen.getByRole("button", { name: "Copied" })).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(COPIED_MS);
    });
    expect(screen.getByRole("button", { name: "Copy" })).toBeInTheDocument();
  });

  it("gives guidance, not an answer, for fields you answer yourself", () => {
    renderRow({
      ...written,
      kind: "you_answer",
      answer: "",
      guidance: "Answer this yourself: we never guess criminal record questions.",
    });
    const row = screen.getByRole("article", { name: "Why this role?" });
    expect(within(row).getByText("You answer")).toBeInTheDocument();
    expect(within(row).queryByRole("button", { name: "Copy" })).not.toBeInTheDocument();
  });

  it("flags an answer over the form's limit", () => {
    renderRow({ ...written, maxChars: 10 });
    expect(screen.getByText(/over the form's limit/)).toBeInTheDocument();
  });

  it("offers 'Where this came from' for written answers", () => {
    const onSelect = vi.fn();
    renderRow(written, { onSelect });
    fireEvent.click(screen.getByRole("button", { name: "Where this came from" }));
    expect(onSelect).toHaveBeenCalledWith(written);
  });

  it("thanks you once you rate an answer", () => {
    const onFeedback = vi.fn();
    renderRow(written, { onFeedback });
    fireEvent.click(screen.getByRole("button", { name: "No, this was wrong" }));
    expect(onFeedback).toHaveBeenCalledWith(written, false);
    expect(screen.getByText("Thanks, noted.")).toBeInTheDocument();
  });
});
