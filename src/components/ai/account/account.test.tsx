import { QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ai } from "@/lib/ai/client";
import { makeQueryClient } from "@/lib/ai/QueryProvider";
import { DevicesPanel } from "./settings/DevicesPanel";
import { NotificationsPanel } from "./settings/NotificationsPanel";

vi.mock("@/lib/ai/client", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/ai/client")>();
  return {
    ...original,
    ai: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() },
  };
});

const api = ai as unknown as Record<
  "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
  ReturnType<typeof vi.fn>
>;
const ok = (data: unknown, status = 200) =>
  Promise.resolve({ data, response: new Response(null, { status }) });

afterEach(() => vi.resetAllMocks());

function wrap(children: React.ReactNode) {
  return <QueryClientProvider client={makeQueryClient()}>{children}</QueryClientProvider>;
}

const PREFERENCES = {
  channels: [
    { channel: "email", label: "Email", connected: true },
    { channel: "push", label: "Push", connected: false },
  ],
  categories: [
    {
      category: "applications",
      label: "Application updates",
      always_email: true,
      channels: { email: true, push: false },
    },
  ],
  quiet_hours: { start: "22:00:00", end: "07:00:00" },
  daily_cap: 10,
};

describe("NotificationsPanel", () => {
  it("shows categories and channels, with the always-email channel disabled", async () => {
    api.GET.mockImplementation(() => ok(PREFERENCES));
    render(wrap(<NotificationsPanel />));
    expect(await screen.findByText("Application updates")).toBeInTheDocument();
    const emailSwitch = screen.getByRole("switch", { name: "Email" });
    expect(emailSwitch).toBeDisabled();
    expect(emailSwitch).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("switch", { name: /Push/ })).toBeDisabled();
    expect(screen.getByText("Not connected yet")).toBeInTheDocument();
  });

  it("toggles a connected channel and saves the change", async () => {
    const connected = {
      ...PREFERENCES,
      channels: [
        { channel: "email", label: "Email", connected: true },
        { channel: "push", label: "Push", connected: true },
      ],
    };
    api.GET.mockImplementation(() => ok(connected));
    api.PUT.mockImplementation(() => ok(connected));
    render(wrap(<NotificationsPanel />));
    const pushSwitch = await screen.findByRole("switch", { name: "Push" });
    fireEvent.click(pushSwitch);

    await waitFor(() =>
      expect(api.PUT).toHaveBeenCalledWith(
        "/api/ai/v1/me/notifications/preferences/",
        expect.objectContaining({
          body: { changes: [{ category: "applications", channel: "push", enabled: true }] },
        }),
      ),
    );
  });

  it("shows an error when saving a preference fails", async () => {
    const connected = {
      ...PREFERENCES,
      channels: [
        { channel: "email", label: "Email", connected: true },
        { channel: "push", label: "Push", connected: true },
      ],
    };
    api.GET.mockImplementation(() => ok(connected));
    api.PUT.mockImplementation(() => Promise.reject(new Error("nope")));
    render(wrap(<NotificationsPanel />));
    const pushSwitch = await screen.findByRole("switch", { name: "Push" });
    fireEvent.click(pushSwitch);
    expect(await screen.findByText("That didn't save. Try again.")).toBeInTheDocument();
  });
});

describe("DevicesPanel", () => {
  it("shows an empty state when there are no devices", async () => {
    api.GET.mockImplementation(() => ok([]));
    render(wrap(<DevicesPanel />));
    expect(await screen.findByText("No devices yet")).toBeInTheDocument();
  });

  it("lists devices and removes one", async () => {
    api.GET.mockImplementation(() =>
      ok([
        {
          id: "d1",
          platform: "android",
          app_version: "1.2.0",
          last_seen_at: "2026-10-01T00:00:00Z",
        },
      ]),
    );
    api.DELETE.mockImplementation(() => ok(null, 204));
    render(wrap(<DevicesPanel />));
    expect(await screen.findByText("Android")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Remove" }));
    await waitFor(() =>
      expect(api.DELETE).toHaveBeenCalledWith(
        "/api/ai/v1/me/devices/{device_id}/",
        expect.objectContaining({ params: { path: { device_id: "d1" } } }),
      ),
    );
  });
});
