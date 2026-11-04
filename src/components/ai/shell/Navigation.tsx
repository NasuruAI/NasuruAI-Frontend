"use client";

/**
 * Left rail (lg: 240 px with labels; md: 72 px icons with tooltips) and the
 * bottom tab bar below 768 px, which mirrors the mobile app (web.md §1.1-1.2).
 */

import { ChevronDown, Smartphone } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { quotaLabel, useEntitlements } from "@/lib/ai/shell";
import { Popover } from "../Popover";
import { cx } from "../cx";
import { activeModule, isActive, type NavItem, NAV_MODULES } from "./nav";

function RailLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const active = isActive(pathname, item.href);
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      title={item.label}
      className={cx(
        "relative flex h-11 items-center gap-3 rounded-r-md px-3 text-body font-semibold transition-[background-color,color,transform] duration-m-fast ease-m hover:translate-x-0.5",
        "md:justify-center lg:justify-start",
        active
          ? "bg-brand-blue-soft text-brand-blue-deep"
          : "text-muted hover:bg-sunken hover:text-ink",
      )}
    >
      {active && (
        <span
          aria-hidden
          className="absolute inset-y-2 left-0 w-[3px] rounded-full bg-brand-gold"
        />
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
  const [expansion, setExpansion] = useState(() => ({
    pathname,
    id: activeModule(pathname)?.id ?? null,
  }));
  const expandedModule =
    expansion.pathname === pathname ? expansion.id : (activeModule(pathname)?.id ?? null);

  return (
    <nav
      aria-label="Main"
      style={{ height: `calc(100dvh - 4rem - ${offset}px)` }}
      className="sticky top-16 hidden w-[72px] shrink-0 flex-col gap-2 overflow-y-auto border-r border-line p-3 md:flex lg:w-60"
    >
      {NAV_MODULES.map((module) => {
        const Icon = module.icon;
        const active = module.items.some((item) => isActive(pathname, item.href));
        const expanded = expandedModule === module.id;
        const listId = `nav-module-${module.id}`;
        return (
          <section key={module.id}>
            <button
              type="button"
              aria-expanded={expanded}
              aria-controls={listId}
              title={module.label}
              onClick={() => setExpansion({ pathname, id: expanded ? null : module.id })}
              className={cx(
                "relative flex h-11 w-full items-center gap-3 rounded-r-md px-3 text-body font-semibold transition-colors duration-m-fast ease-m",
                "md:justify-center lg:justify-start",
                active
                  ? "bg-brand-blue-soft text-brand-blue-deep"
                  : "text-muted hover:bg-sunken hover:text-ink",
              )}
            >
              {active && (
                <span
                  aria-hidden
                  className="absolute inset-y-2 left-0 w-[3px] rounded-full bg-brand-gold"
                />
              )}
              <Icon aria-hidden className={cx("size-5 shrink-0", active && "text-accent")} />
              <span className="md:sr-only lg:not-sr-only">{module.label}</span>
              <ChevronDown
                aria-hidden
                className={cx(
                  "ml-auto hidden size-4 shrink-0 transition-transform lg:block",
                  expanded && "rotate-180",
                )}
              />
            </button>
            <ul id={listId} hidden={!expanded} className="mt-1 space-y-1 lg:pl-3">
              {module.items.map((item) => (
                <li key={item.href}>
                  <RailLink item={item} pathname={pathname} />
                </li>
              ))}
            </ul>
          </section>
        );
      })}
      <div className="mt-auto space-y-1 pt-4">
        <PlanChip />
        <GetTheApp />
      </div>
    </nav>
  );
}

export function BottomTabs() {
  const pathname = usePathname();
  const [menuState, setMenuState] = useState<{ pathname: string; id: string | null }>({
    pathname,
    id: null,
  });
  const openModule = menuState.pathname === pathname ? menuState.id : null;
  const triggerRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const menuRef = useRef<HTMLDivElement>(null);
  const active = activeModule(pathname);

  useEffect(() => {
    if (!openModule) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setMenuState({ pathname, id: null });
      triggerRefs.current[openModule]?.focus();
    };
    const closeOnOutsideClick = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (
        !menuRef.current?.contains(target) &&
        !triggerRefs.current[openModule]?.contains(target)
      ) {
        setMenuState({ pathname, id: null });
      }
    };
    document.addEventListener("keydown", closeOnEscape);
    document.addEventListener("pointerdown", closeOnOutsideClick);
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      document.removeEventListener("pointerdown", closeOnOutsideClick);
    };
  }, [openModule, pathname]);

  const selectedModule = NAV_MODULES.find((module) => module.id === openModule);

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <div
        ref={menuRef}
        id="mobile-module-menu"
        role="region"
        aria-label={selectedModule?.label ?? "Navigation module"}
        hidden={!selectedModule}
        className="fixed inset-x-3 bottom-[calc(4rem+env(safe-area-inset-bottom)+0.75rem)] z-50 max-h-[60dvh] overflow-y-auto rounded-r-md border border-line bg-surface p-3 shadow-e2"
      >
        {selectedModule && (
          <ul className="space-y-1">
            {selectedModule.items.map((item) => {
              const itemActive = isActive(pathname, item.href);
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={itemActive ? "page" : undefined}
                    onClick={() => setMenuState({ pathname, id: null })}
                    className={cx(
                      "flex min-h-11 items-center gap-3 rounded-r-sm px-3 text-body-s font-semibold",
                      itemActive
                        ? "bg-brand-blue-soft text-brand-blue-deep"
                        : "text-muted hover:bg-sunken hover:text-ink",
                    )}
                  >
                    <Icon aria-hidden className="size-5 shrink-0" />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <ul className="grid grid-cols-6">
        {NAV_MODULES.map(({ id, label, mobileLabel, icon: Icon }) => {
          const moduleActive = active?.id === id;
          const expanded = openModule === id;
          const listId = "mobile-module-menu";
          return (
            <li key={id}>
              <button
                type="button"
                ref={(element) => {
                  triggerRefs.current[id] = element;
                }}
                aria-label={label}
                aria-expanded={expanded}
                aria-controls={listId}
                onClick={() => setMenuState({ pathname, id: expanded ? null : id })}
                className={cx(
                  "relative flex h-16 w-full flex-col items-center justify-center gap-1 text-[0.625rem] font-semibold transition-colors duration-m-fast ease-m",
                  moduleActive || expanded
                    ? "bg-brand-blue-soft text-brand-blue-deep"
                    : "text-muted hover:bg-sunken",
                )}
              >
                <Icon aria-hidden className="size-5" />
                <span className="max-w-full truncate px-0.5">{mobileLabel}</span>
                {moduleActive && (
                  <span
                    aria-hidden="true"
                    className="absolute top-0 right-1/4 left-1/4 h-0.5 rounded-full bg-brand-gold"
                  />
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
