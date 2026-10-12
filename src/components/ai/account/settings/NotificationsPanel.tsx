"use client";

/**
 * Settings → Notifications (web.md §12 "settings/notifications"): which
 * channel gets which kind of message, quiet hours, and the daily cap.
 */

import { useState } from "react";
import { usePreferences, useSetPreference, useSetQuietHours } from "@/lib/ai/account";
import { Switch } from "../../choice";
import { InlineAlert, Skeleton } from "../../feedback";
import { TextField } from "../../fields";

export function NotificationsPanel() {
  const preferences = usePreferences();
  const setPreference = useSetPreference();
  const quietHours = useSetQuietHours();
  const [error, setError] = useState<string | null>(null);

  if (preferences.isPending) return <Skeleton className="h-60" />;
  if (preferences.isError || !preferences.data) {
    return <InlineAlert tone="danger" title="We couldn't load your notification settings." />;
  }
  const { channels, categories, quiet_hours, daily_cap } = preferences.data;

  function toggle(category: string, channel: string, enabled: boolean) {
    setError(null);
    setPreference.mutate(
      { category, channel, enabled },
      { onError: () => setError("That didn't save. Try again.") },
    );
  }

  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-h3 text-ink">What goes where</h2>
        <p className="mt-1 text-body-s text-muted">
          Up to {daily_cap} notifications a day in total, whichever channels you choose below.
        </p>
        {error && <InlineAlert tone="danger" title={error} className="mt-3" />}
        <div className="mt-4 space-y-5">
          {categories.map((category) => (
            <div key={category.category} className="rounded-r-md border border-line p-4">
              <p className="font-semibold text-ink">{category.label}</p>
              <div className="mt-2 divide-y divide-line">
                {channels.map((channel) => {
                  const forcedEmail = category.always_email && channel.channel === "email";
                  return (
                    <Switch
                      key={channel.channel}
                      label={channel.label}
                      description={!channel.connected ? "Not connected yet" : undefined}
                      checked={forcedEmail || Boolean(category.channels[channel.channel])}
                      disabled={forcedEmail || !channel.connected || setPreference.isPending}
                      onChange={(checked) => toggle(category.category, channel.channel, checked)}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-h3 text-ink">Quiet hours</h2>
        <p className="mt-1 text-body-s text-muted">
          No push, WhatsApp or Telegram messages in this window. Email and in-app still arrive.
        </p>
        <div className="mt-3 flex max-w-xs items-end gap-3">
          <TextField
            label="From"
            type="time"
            defaultValue={quiet_hours.start?.slice(0, 5) ?? ""}
            onBlur={(event) =>
              quietHours.mutate({ start: event.target.value || null, end: quiet_hours.end })
            }
          />
          <TextField
            label="To"
            type="time"
            defaultValue={quiet_hours.end?.slice(0, 5) ?? ""}
            onBlur={(event) =>
              quietHours.mutate({ start: quiet_hours.start, end: event.target.value || null })
            }
          />
        </div>
      </section>
    </div>
  );
}
