"use client";

/**
 * Settings → Devices (web.md §12): the push-notification devices on this
 * account. (Signed-in sessions aren't tracked yet — this is push tokens
 * only, not "sign out everywhere".)
 */

import { Smartphone } from "lucide-react";
import { useDevices, useRemoveDevice } from "@/lib/ai/account";
import { Button } from "../../Button";
import { formatDate } from "../../evidence/format";
import { EmptyState, InlineAlert, Skeleton } from "../../feedback";

const PLATFORM_LABEL: Record<string, string> = {
  android: "Android",
  ios: "iPhone",
  web: "Web browser",
};

export function DevicesPanel() {
  const devices = useDevices();
  const remove = useRemoveDevice();

  if (devices.isPending) return <Skeleton className="h-40" />;
  if (devices.isError) return <InlineAlert tone="danger" title="We couldn't load your devices." />;
  if (!devices.data?.length) {
    return (
      <EmptyState icon={<Smartphone aria-hidden />} title="No devices yet">
        Devices that get push notifications from Nasuru AI will show up here.
      </EmptyState>
    );
  }

  return (
    <div>
      <h2 className="text-h3 text-ink">Devices</h2>
      <p className="mt-1 text-body-s text-muted">
        Where push notifications from Nasuru AI can reach you.
      </p>
      <ul className="mt-4 divide-y divide-line rounded-r-md border border-line">
        {devices.data.map((device) => (
          <li key={device.id} className="flex items-center justify-between gap-3 p-4">
            <div>
              <p className="font-semibold text-ink">
                {PLATFORM_LABEL[device.platform] ?? device.platform}
                {device.app_version && (
                  <span className="ml-1 text-muted">v{device.app_version}</span>
                )}
              </p>
              <p className="text-body-s text-muted">Last seen {formatDate(device.last_seen_at)}</p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              loading={remove.isPending && remove.variables === device.id}
              onClick={() => remove.mutate(device.id)}
            >
              Remove
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
