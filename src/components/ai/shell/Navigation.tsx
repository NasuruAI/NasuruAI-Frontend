"use client";

/**
 * Left rail (lg: 240 px with labels; md: 72 px icons with tooltips) and the
 * bottom tab bar below 768 px, which mirrors the mobile app (web.md §1.1-1.2).
 */

import { Smartphone } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { quotaLabel, useEntitlements } from "@/lib/ai/shell";
import { Popover } from "../Popover";
import { cx } from "../cx";
import { isActive, type NavItem, PRIMARY_NAV, UTILITY_NAV } from "./nav";

function RailLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const active = isActive(pathname, item.href);
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      title={item.label}
      className={cx(
        "relative flex h-11 items-center gap-3 rounded-r-md px-3 text-body font-semibold transition-colors duration-m-fast ease-m",
        "md:justify-center lg:justify-start",
        active ? "bg-accent-soft text-ink" : "text-muted hover:bg-sunken hover:text-ink",
      )}
    >
      {active && (
        <span aria-hidden className="absolute inset-y-2 left-0 w-[3px] rounded-full bg-accent" />
      )}
      <Icon aria-hidden className={cx("size-5 shrink-0", active && "text-accent")} />
      <span className="md:sr-only lg:not-sr-only">{item.label}</span>
    </Link>
  );
}

/** "Plus · 2/∞": the tier and this month's answer-pack quota. */
export function PlanChip() {
  const { data } = useEntitlements();
  if (!data) return null;
  const quota = quotaLabel(data);
  return (
    <Link
      href="/ai/billing"
      className="flex h-11 items-center gap-2 rounded-r-md border border-line px-3 text-body-s hover:bg-sunken md:justify-center lg:justify-start"
      title={`${data.plan.name} plan${quota ? `, ${quota} answer packs this month` : ""}`}
    >
      <span className="font-semibold text-ink">{data.plan.name}</span>
      {quota && (
        <span className="text-metric-s tabular-nums text-muted md:hidden lg:inline">
          · {quota}
          <span className="sr-only"> answer packs this month</span>
        </span>
      )}
    </Link>
  );
}

function GetTheApp() {
  return (
    <Popover
      label="Get the app"
      trigger={(props) => (
        <button
          type="button"
          {...props}
          title="Get the app"
          className="flex h-11 w-full items-center gap-3 rounded-r-md px-3 text-body-s font-semibold text-muted hover:bg-sunken hover:text-ink md:justify-center lg:justify-start"
        >
          <Smartphone aria-hidden className="size-5 shrink-0" />
          <span className="md:sr-only lg:not-sr-only">Get the app</span>
        </button>
      )}
    >
      <p className="w-60 p-2 text-body-s text-muted">
        The Android app is on its way: lighter on data, with offline answer packs. We&apos;ll let
        you know here when it&apos;s ready.
      </p>
    </Popover>
  );
}

export function NavRail({ offset = 0 }: { offset?: number }) {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Main"
      style={{ height: `calc(100dvh - 4rem - ${offset}px)` }}
      className="sticky top-16 hidden w-[72px] shrink-0 flex-col gap-1 overflow-y-auto border-r border-line p-3 md:flex lg:w-60"
    >
      {PRIMARY_NAV.map((item) => (
        <RailLink key={item.href} item={item} pathname={pathname} />
      ))}
      <hr className="my-2 border-line" />
      {UTILITY_NAV.map((item) => (
        <RailLink key={item.href} item={item} pathname={pathname} />
      ))}
      <div className="mt-auto space-y-1 pt-4">
        <PlanChip />
        <GetTheApp />
      </div>
    </nav>
  );
}

export function BottomTabs() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul className="grid grid-cols-5">
        {PRIMARY_NAV.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cx(
                  "flex h-16 flex-col items-center justify-center gap-1 text-caption font-semibold",
                  active ? "text-accent" : "text-muted",
                )}
              >
                <Icon aria-hidden className="size-5" />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
