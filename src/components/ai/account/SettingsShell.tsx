"use client";

/**
 * Settings (web.md §12 "/settings/[section]"): a sub-nav of sections, one
 * panel shown at a time.
 */

import { Bell, Database, Mail, Plug, Smartphone } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ConnectionsPanel } from "./settings/ConnectionsPanel";
import { DataPanel } from "./settings/DataPanel";
import { DevicesPanel } from "./settings/DevicesPanel";
import { ExtensionPanel } from "./settings/ExtensionPanel";
import { NotificationsPanel } from "./settings/NotificationsPanel";
import { cx } from "../cx";

const SECTIONS = [
  { slug: "notifications", label: "Notifications", icon: Bell, Panel: NotificationsPanel },
  { slug: "devices", label: "Devices", icon: Smartphone, Panel: DevicesPanel },
  { slug: "extension", label: "Extension", icon: Plug, Panel: ExtensionPanel },
  { slug: "connections", label: "Connections", icon: Mail, Panel: ConnectionsPanel },
  { slug: "data", label: "Your data", icon: Database, Panel: DataPanel },
] as const;

export function SettingsShell({ section }: { section: string }) {
  const current = SECTIONS.find((s) => s.slug === section);
  if (!current) notFound();
  const { Panel } = current;

  return (
    <div>
      <h1 className="font-display text-h2 text-ink">Settings</h1>
      <div className="mt-6 flex flex-col gap-8 lg:flex-row">
        <nav aria-label="Settings sections" className="shrink-0 lg:w-56">
          <ul className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
            {SECTIONS.map((item) => {
              const Icon = item.icon;
              const active = item.slug === section;
              return (
                <li key={item.slug} className="shrink-0">
                  <Link
                    href={`/ai/settings/${item.slug}`}
                    aria-current={active ? "page" : undefined}
                    className={cx(
                      "flex items-center gap-2 rounded-r-md px-3 py-2 text-body-s font-semibold whitespace-nowrap",
                      active
                        ? "bg-accent-soft text-accent"
                        : "text-muted hover:bg-sunken hover:text-ink",
                    )}
                  >
                    <Icon aria-hidden className="size-4" />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="min-w-0 flex-1">
          <Panel />
        </div>
      </div>
    </div>
  );
}
