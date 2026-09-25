"use client";

/**
 * Notifications bell and avatar menu (web.md §1.1).
 */

import {
  Bell,
  CreditCard,
  HelpCircle,
  LogOut,
  Plug,
  Settings,
  ShieldCheck,
  User,
} from "lucide-react";
import Link from "next/link";
import { useSession } from "@/lib/auth/SessionProvider";
import { inboxGroup, type InboxItem, useInbox, useMarkAllRead } from "@/lib/ai/shell";
import { Button } from "../Button";
import { CountBadge } from "../Chip";
import { Popover } from "../Popover";
import { cx } from "../cx";

function relative(createdAt: string): string {
  const minutes = Math.round((Date.now() - new Date(createdAt).getTime()) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  return new Date(createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function NotificationsBell() {
  const { data } = useInbox();
  const markAll = useMarkAllRead();
  const unread = data?.unread ?? 0;
  const items = data?.results ?? [];
  const groups = (["Today", "This week", "Earlier"] as const)
    .map((name) => ({ name, items: items.filter((item) => inboxGroup(item.created_at) === name) }))
    .filter((group) => group.items.length > 0);

  return (
    <Popover
      label="Notifications"
      align="end"
      trigger={(props) => (
        <button
          type="button"
          {...props}
          aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
          className="relative inline-flex size-11 items-center justify-center rounded-r-md text-ink hover:bg-sunken"
        >
          <Bell aria-hidden className="size-5" />
          {unread > 0 && (
            <span className="absolute top-1 right-1">
              <CountBadge count={unread} label="unread" />
            </span>
          )}
        </button>
      )}
    >
      {(close) => (
        <div className="w-80 max-w-[calc(100vw-2rem)]">
          <div className="flex items-center justify-between px-2 pb-2">
            <h2 className="font-display text-h4">Notifications</h2>
            {unread > 0 && (
              <Button
                size="sm"
                variant="tertiary"
                loading={markAll.isPending}
                onClick={() => markAll.mutate()}
              >
                Mark all read
              </Button>
            )}
          </div>
          {groups.length === 0 ? (
            <p className="px-2 py-6 text-center text-body-s text-muted">
              Nothing yet. We&apos;ll tell you when something changes.
            </p>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              {groups.map((group) => (
                <section key={group.name} aria-label={group.name}>
                  <h3 className="px-2 pt-2 pb-1 text-overline text-muted uppercase">
                    {group.name}
                  </h3>
                  <ul>
                    {group.items.map((item) => (
                      <li key={item.id}>
                        <NotificationRow item={item} onOpen={close} />
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </div>
      )}
    </Popover>
  );
}

function NotificationRow({ item, onOpen }: { item: InboxItem; onOpen: () => void }) {
  const body = (
    <>
      <span className="flex items-start gap-2">
        {!item.read_at && (
          <span aria-hidden className="mt-2 size-2 shrink-0 rounded-full bg-accent" />
        )}
        <span className="min-w-0 flex-1">
          <span className="block font-semibold text-ink">
            {item.subject || item.category_display}
            {!item.read_at && <span className="sr-only"> (unread)</span>}
          </span>
          <span className="line-clamp-2 block text-body-s text-muted">{item.body}</span>
          <span className="block text-caption text-subtle">{relative(item.created_at)}</span>
        </span>
      </span>
    </>
  );
  const style = cx("block rounded-r-sm px-2 py-2", item.action_url && "hover:bg-sunken");
  return item.action_url?.startsWith("/") ? (
    <Link href={item.action_url} onClick={onOpen} className={style}>
      {body}
    </Link>
  ) : (
    <div className={style}>{body}</div>
  );
}

export function initials(
  first?: string | null,
  last?: string | null,
  fallback?: string | null,
): string {
  const letters = `${first?.[0] ?? ""}${last?.[0] ?? ""}`.toUpperCase();
  return letters || (fallback?.[0] ?? "?").toUpperCase();
}

const MENU = [
  { href: "/ai/profile", label: "Profile", icon: User },
  { href: "/ai/billing", label: "Subscription", icon: CreditCard },
  { href: "/ai/settings/notifications", label: "Settings", icon: Settings },
  { href: "/ai/settings/data", label: "Your data", icon: ShieldCheck },
  { href: "/ai/settings/extension", label: "Extension", icon: Plug },
  { href: "/contact", label: "Help", icon: HelpCircle },
];

export function AvatarMenu() {
  const { session, signOut } = useSession();
  const user = session?.user;
  return (
    <Popover
      label="Account"
      align="end"
      trigger={(props) => (
        <button
          type="button"
          {...props}
          aria-label="Account menu"
          className="inline-flex size-11 items-center justify-center rounded-full"
        >
          <span className="flex size-9 items-center justify-center rounded-full bg-accent-soft font-display text-body-s font-semibold text-accent">
            {initials(user?.first_name, user?.last_name, user?.email ?? user?.phone_e164)}
          </span>
        </button>
      )}
    >
      {(close) => (
        <div className="w-60">
          {user && (
            <p className="border-b border-line px-2 pb-2 text-body-s">
              <span className="block font-semibold text-ink">
                {user.full_name || "Your account"}
              </span>
              <span className="block truncate text-muted">{user.email ?? user.phone_e164}</span>
            </p>
          )}
          <ul className="py-1">
            {MENU.map(({ href, label, icon: Icon }) => (
              <li key={href}>
                <Link
                  href={href}
                  onClick={close}
                  className="flex items-center gap-3 rounded-r-sm px-2 py-2 text-body text-ink hover:bg-sunken"
                >
                  <Icon aria-hidden className="size-4 text-muted" />
                  {label}
                </Link>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => {
              close();
              signOut();
            }}
            className="flex w-full items-center gap-3 rounded-r-sm border-t border-line px-2 py-2 text-left text-body text-ink hover:bg-sunken"
          >
            <LogOut aria-hidden className="size-4 text-muted" />
            Sign out
          </button>
        </div>
      )}
    </Popover>
  );
}
