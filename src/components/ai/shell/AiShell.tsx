"use client";

/**
 * The Nasuru AI app frame (web.md §1): top bar, rail or bottom tabs, global
 * banners, the xl context panel and the ⌘K palette. Signed-out visitors go to
 * sign-in and come back here afterwards.
 */

import { Search } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useSession } from "@/lib/auth/SessionProvider";
import {
  CommandPalette,
  type PaletteResult,
  useCommandPalette,
} from "@/components/staff/CommandPalette";
import { Skeleton } from "../feedback";
import { ToastProvider } from "../Toast";
import { ContextPanelSlot } from "./ContextPanel";
import { DestinationSwitcher } from "./DestinationSwitcher";
import { GlobalBanners } from "./GlobalBanners";
import { BottomTabs, NavRail } from "./Navigation";
import { PRIMARY_NAV, UTILITY_NAV } from "./nav";
import { AvatarMenu, NotificationsBell } from "./TopBarMenus";

/** What ⌘K can reach before the per-section searches exist. */
export const PALETTE_INDEX: PaletteResult[] = [
  {
    id: "action-offer",
    title: "Check an offer",
    detail: "Is a job offer or CoS genuine?",
    href: "/ai/check-offer",
    group: "Actions",
  },
  {
    id: "action-pack",
    title: "New answer pack from URL",
    detail: "Paste any job link",
    href: "/ai/packs/new",
    group: "Actions",
  },
  {
    id: "go-packs",
    title: "Answer packs",
    detail: "Go to",
    href: "/ai/packs",
    group: "Pages",
  },
  {
    id: "go-cv",
    title: "Your CV and cover letters",
    detail: "Go to",
    href: "/ai/cv",
    group: "Pages",
  },
  {
    id: "action-compare",
    title: "Compare all 7 countries",
    detail: "Free, doesn't switch",
    href: "/ai/compare",
    group: "Actions",
  },
  // Pages an action already reaches (Check offer) are listed once, as the action.
  ...[...PRIMARY_NAV, ...UTILITY_NAV]
    .filter((item) => item.href !== "/ai/check-offer")
    .map((item) => ({
      id: `go-${item.href}`,
      title: item.label,
      detail: "Go to",
      href: item.href,
      group: "Pages",
    })),
  {
    id: "go-profile",
    title: "Profile",
    detail: "Your confirmed facts",
    href: "/ai/profile",
    group: "Settings",
  },
  {
    id: "go-billing",
    title: "Subscription",
    detail: "Plan, invoices, cancel",
    href: "/ai/billing",
    group: "Settings",
  },
  {
    id: "go-notifications",
    title: "Notification settings",
    detail: "Push, WhatsApp, email",
    href: "/ai/settings/notifications",
    group: "Settings",
  },
  {
    id: "go-data",
    title: "Your data",
    detail: "Export or delete",
    href: "/ai/settings/data",
    group: "Settings",
  },
];

export async function searchPalette(term: string): Promise<PaletteResult[]> {
  const needle = term.toLowerCase();
  return PALETTE_INDEX.filter((item) =>
    `${item.title} ${item.detail}`.toLowerCase().includes(needle),
  );
}

const SUGGESTIONS = PALETTE_INDEX.filter((item) => item.group === "Actions");

export function AiShell({ children }: { children: React.ReactNode }) {
  const { session, loading } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const palette = useCommandPalette();
  // The rail fills the height left under the top bar and the banners, so
  // its last items stay reachable on a short page while a banner shows.
  const banners = useRef<HTMLDivElement>(null);
  const [bannerHeight, setBannerHeight] = useState(0);
  useEffect(() => {
    const element = banners.current;
    if (!element) return;
    const observer = new ResizeObserver(() => setBannerHeight(element.offsetHeight));
    observer.observe(element);
    return () => observer.disconnect();
  }, [session]);

  useEffect(() => {
    if (!loading && !session) router.replace(`/ai/login?next=${encodeURIComponent(pathname)}`);
  }, [loading, session, router, pathname]);

  if (loading || !session) {
    return (
      <div className="p-8" aria-busy="true" aria-label="Loading">
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  return (
    <ToastProvider>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-r-md focus:bg-surface focus:px-4 focus:py-2 focus:shadow-e2"
      >
        Skip to content
      </a>
      <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b border-line bg-surface px-3 md:px-4">
        <Link
          href="/ai/plan"
          className="flex items-center gap-2 rounded-r-md px-1 py-1"
          aria-label="Nasuru AI, your plan"
        >
          <span
            aria-hidden
            className="flex size-8 items-center justify-center rounded-r-sm bg-accent font-display text-body font-bold text-on-accent"
          >
            N
          </span>
          <span className="hidden font-display text-h4 font-semibold sm:inline">Nasuru AI</span>
        </Link>
        <div className="ml-1 md:ml-4">
          <DestinationSwitcher />
        </div>
        <div className="flex flex-1 justify-center">
          <button
            type="button"
            onClick={palette.open}
            className="hidden h-10 w-full max-w-sm items-center gap-2 rounded-r-md border border-field-line bg-surface px-3 text-body text-subtle hover:border-line-strong md:flex"
          >
            <Search aria-hidden className="size-4" />
            <span className="flex-1 text-left">Search…</span>
            <kbd className="rounded-r-sm border border-line px-1.5 font-mono text-caption text-muted">
              ⌘K
            </kbd>
          </button>
        </div>
        <button
          type="button"
          onClick={palette.open}
          aria-label="Search"
          className="inline-flex size-11 items-center justify-center rounded-r-md text-ink hover:bg-sunken md:hidden"
        >
          <Search aria-hidden className="size-5" />
        </button>
        <NotificationsBell />
        <AvatarMenu />
      </header>
      <div ref={banners}>
        <GlobalBanners />
      </div>
      <ContextPanelSlot>
        {(setSlot) => (
          <div className="flex">
            <NavRail offset={bannerHeight} />
            <main
              id="main"
              tabIndex={-1}
              className="min-w-0 flex-1 px-4 py-6 pb-24 md:px-6 md:pb-8 lg:px-8"
            >
              {children}
            </main>
            <aside
              ref={setSlot}
              aria-label="Details"
              className="sticky top-16 hidden h-[calc(100vh-4rem)] w-80 shrink-0 overflow-y-auto border-l border-line xl:[&:not(:empty)]:block"
            />
          </div>
        )}
      </ContextPanelSlot>
      <BottomTabs />
      <CommandPalette
        controller={palette}
        search={searchPalette}
        suggestions={SUGGESTIONS}
        label="Search Nasuru AI"
        placeholder="Search pages and actions…"
      />
    </ToastProvider>
  );
}
