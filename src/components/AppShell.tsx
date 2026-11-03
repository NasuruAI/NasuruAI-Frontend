"use client";

/**
 * The signed-in app frame.
 *
 * Every page used to hand-roll its own `<main>` and its own `<nav>`, with no
 * banner landmark, no skip target, and two unlabelled navs on the dashboard
 * (§B1). Now there is one banner, one `<main id="content">`, and every nav has
 * a name a screen reader can distinguish.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "@/lib/auth/SessionProvider";
import { BrandLockup } from "@/components/ui/Brand";

const NAV = [
  { href: "/dashboard", label: "Applications" },
  { href: "/documents", label: "Documents" },
  { href: "/referrals", label: "Referrals" },
  { href: "/settings/notifications", label: "Notifications" },
];

export function SkipLink() {
  /**
   * Off-screen until focused, then pinned to the top-left. `sr-only` alone
   * would keep it invisible even when focused, which defeats the point — a
   * sighted keyboard user has to be able to see what they have landed on.
   */
  return (
    <a
      href="#content"
      className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-accent focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-on-accent"
    >
      Skip to main content
    </a>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { session, signOut, hasAccess } = useSession();

  /**
   * Before the access fee is confirmed, every destination in the main nav
   * bounces straight back to checkout — so showing it would be a loop with no
   * exit. Checkout and the payment callback get the banner, the skip link and
   * the landmark structure, but no navigation to pages the student cannot
   * reach yet.
   */
  const showNav = Boolean(session) && hasAccess;

  return (
    <div className="min-h-screen bg-canvas">
      <SkipLink />

      <header className="sticky top-0 z-30 border-b border-line bg-surface/95 shadow-e1 backdrop-blur">
        <div className="mx-auto flex min-h-16 max-w-7xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-4 py-3 sm:px-6">
          <Link href="/dashboard" aria-label="Nasuru applications">
            <BrandLockup size="sm" />
          </Link>

          {showNav && (
            <nav aria-label="Main" className="order-3 w-full sm:order-none sm:w-auto">
              <ul className="flex flex-wrap gap-x-2 gap-y-1 text-sm">
                {NAV.map((item) => {
                  const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        // `aria-current` is what tells a screen reader which page
                        // this is; the underline is the sighted equivalent.
                        aria-current={active ? "page" : undefined}
                        className={
                          active
                            ? "rounded-full bg-brand-blue-soft px-3 py-2 font-semibold text-brand-blue-deep shadow-e1"
                            : "rounded-full px-3 py-2 text-muted transition hover:bg-sunken hover:text-ink"
                        }
                      >
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
          )}

          <nav aria-label="Account" className="flex items-center gap-3 text-sm sm:gap-4">
            {session?.user.first_name && (
              <span className="hidden text-muted sm:inline">{session.user.first_name}</span>
            )}
            <button
              type="button"
              onClick={signOut}
              className="rounded-full px-3 py-2 font-semibold text-muted transition hover:bg-sunken hover:text-ink"
            >
              Sign out
            </button>
          </nav>
        </div>
      </header>

      <main id="content" tabIndex={-1}>
        {children}
      </main>
    </div>
  );
}
