import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { makeQueryClient } from "@/lib/ai/QueryProvider";
import { inboxGroup, quotaLabel, type Entitlements, type RuleChange } from "@/lib/ai/shell";
import { searchPalette } from "./AiShell";
import { SwitchDialog } from "./DestinationSwitcher";
import { unseenChange } from "./GlobalBanners";
import { isActive } from "./nav";
import { initials } from "./TopBarMenus";

describe("navigation", () => {
  it("marks a section active on its pages and nowhere else", () => {
    expect(isActive("/ai/jobs", "/ai/jobs")).toBe(true);
    expect(isActive("/ai/jobs/123", "/ai/jobs")).toBe(true);
    expect(isActive("/ai/jobsearch", "/ai/jobs")).toBe(false);
    expect(isActive("/ai/plan", "/ai/jobs")).toBe(false);
  });
});

describe("notifications", () => {
  const now = new Date(2026, 8, 25, 15, 0);
  it("groups by local day: today, this week, earlier", () => {
    expect(inboxGroup(new Date(2026, 8, 25, 0, 5).toISOString(), now)).toBe("Today");
    expect(inboxGroup(new Date(2026, 8, 24, 23, 59).toISOString(), now)).toBe("This week");
    expect(inboxGroup(new Date(2026, 8, 19, 12, 0).toISOString(), now)).toBe("This week");
    expect(inboxGroup(new Date(2026, 8, 18, 12, 0).toISOString(), now)).toBe("Earlier");
  });

  it("builds initials from names, else the email or number", () => {
    expect(initials("Chidinma", "Okafor")).toBe("CO");
    expect(initials("", "", "emeka@example.com")).toBe("E");
    expect(initials(null, null, "+2348031234567")).toBe("+");
  });
});

describe("plan chip", () => {
  it("shows answer packs used against the limit, ∞ when unlimited", () => {
    const base = {
      meters: { answer_pack: { used: 2, limit: 3, remaining: 1 } },
    } as unknown as Entitlements;
    expect(quotaLabel(base)).toBe("2/3");
    const unlimited = {
      meters: { answer_pack: { used: 5, limit: null, remaining: null } },
    } as unknown as Entitlements;
    expect(quotaLabel(unlimited)).toBe("5/∞");
    expect(quotaLabel(undefined)).toBeNull();
  });
});

describe("rule change banner", () => {
  const change = (id: string, daysAgo: number) =>
    ({ id, created_at: new Date(Date.now() - daysAgo * 86_400_000).toISOString() }) as RuleChange;

  it("shows the newest change from the last week until it is dismissed", () => {
    expect(unseenChange([change("c2", 1), change("c1", 3)], null)?.id).toBe("c2");
    expect(unseenChange([change("c2", 1)], "c2")).toBeNull();
    expect(unseenChange([change("c3", 10)], null)).toBeNull();
    expect(unseenChange([], null)).toBeNull();
  });
});

describe("command palette", () => {
  it("finds pages and actions by words in their title or detail", async () => {
    const hits = await searchPalette("offer");
    expect(hits.map((hit) => hit.href)).toContain("/ai/check-offer");
    expect((await searchPalette("export")).map((hit) => hit.href)).toContain("/ai/settings/data");
    expect(await searchPalette("zzz")).toEqual([]);
  });
});

function renderDialog(props: Partial<React.ComponentProps<typeof SwitchDialog>> = {}) {
  return render(
    <QueryClientProvider client={makeQueryClient()}>
      <SwitchDialog
        open
        onClose={vi.fn()}
        current="DE"
        nextAllowedAt={null}
        inGrace={false}
        {...props}
      />
    </QueryClientProvider>,
  );
}

describe("switch destination dialog", () => {
  it("names the consequence and the other six countries", () => {
    renderDialog();
    expect(screen.getByText(/Germany pipeline is archived, read-only/)).toBeInTheDocument();
    expect(screen.getAllByRole("radio")).toHaveLength(6);
    expect(screen.queryByRole("radio", { name: /Germany/ })).not.toBeInTheDocument();
  });

  it("switches only once a country is picked, and says where to", async () => {
    const user = userEvent.setup();
    renderDialog();
    const confirm = screen.getByRole("button", { name: "Switch" });
    expect(confirm).toBeDisabled();
    await user.click(screen.getByRole("radio", { name: /Canada/ }));
    expect(screen.getByRole("button", { name: "Switch to Canada" })).toBeEnabled();
  });

  it("during the cooling-off period, says when switching is allowed instead", () => {
    const soon = new Date(Date.now() + 12 * 86_400_000);
    renderDialog({ nextAllowedAt: soon.toISOString() });
    expect(screen.getByText(/You can switch again on/)).toBeInTheDocument();
    expect(screen.queryAllByRole("radio")).toHaveLength(0);
    expect(screen.getByRole("button", { name: "Got it" })).toBeInTheDocument();
  });

  it("in the first day, says the choice can be changed freely", () => {
    renderDialog({ inGrace: true });
    expect(screen.getByText(/change it freely/)).toBeInTheDocument();
  });
});
