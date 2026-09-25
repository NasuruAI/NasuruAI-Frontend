"use client";

/**
 * Tabs (design-system §8.1): `underline` for content, `pill` for filters.
 * WAI-ARIA tabs: arrow keys move and select, Home/End jump, and only the
 * active tab is in the tab order.
 */

import { useId, useRef } from "react";
import { cx } from "./cx";

export type TabItem<T extends string> = { value: T; label: React.ReactNode; count?: number };

export function Tabs<T extends string>({
  id,
  label,
  tabs,
  value,
  onChange,
  variant = "underline",
  className,
}: {
  /** Shared with each TabPanel's `tabsId`, so tab and panel are linked. */
  id?: string;
  label: string;
  tabs: TabItem<T>[];
  value: T;
  onChange: (value: T) => void;
  variant?: "underline" | "pill";
  className?: string;
}) {
  const generated = useId();
  const base = id ?? generated;
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  function move(index: number) {
    const next = (index + tabs.length) % tabs.length;
    onChange(tabs[next].value);
    refs.current[next]?.focus();
  }

  function onKeyDown(index: number, event: React.KeyboardEvent) {
    const keys: Record<string, number> = {
      ArrowRight: index + 1,
      ArrowLeft: index - 1,
      Home: 0,
      End: tabs.length - 1,
    };
    if (event.key in keys) {
      event.preventDefault();
      move(keys[event.key]);
    }
  }

  return (
    <div
      role="tablist"
      aria-label={label}
      className={cx(
        "relative flex gap-1 overflow-x-auto",
        variant === "underline" && "border-b border-line",
        className,
      )}
    >
      {tabs.map((tab, index) => {
        const selected = tab.value === value;
        return (
          <button
            key={tab.value}
            ref={(element) => {
              refs.current[index] = element;
            }}
            id={tabId(base, tab.value)}
            role="tab"
            type="button"
            aria-selected={selected}
            // Only a rendered panel may be referenced: with `id` the caller renders
            // the selected tab's TabPanel; without it (filters) there is none.
            aria-controls={id && selected ? panelId(base, tab.value) : undefined}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(tab.value)}
            onKeyDown={(event) => onKeyDown(index, event)}
            className={cx(
              "inline-flex h-11 shrink-0 items-center gap-2 px-3 text-body font-semibold whitespace-nowrap transition-colors duration-m-fast ease-m",
              variant === "underline" &&
                cx(
                  "-mb-px border-b-2",
                  selected
                    ? "border-accent text-ink"
                    : "border-transparent text-muted hover:text-ink",
                ),
              variant === "pill" &&
                cx(
                  "h-9 rounded-full text-body-s",
                  selected ? "bg-accent-soft text-accent" : "text-muted hover:bg-sunken",
                ),
            )}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span className="rounded-full bg-sunken px-2 text-caption font-semibold tabular-nums text-muted">
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/** The panel for the selected tab. Render one, keyed by the tabs' `value`. */
export function TabPanel({
  tabsId,
  value,
  children,
  className,
}: {
  /** The `id` given to Tabs. */
  tabsId?: string;
  value: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      role="tabpanel"
      id={tabsId ? panelId(tabsId, value) : undefined}
      aria-labelledby={tabsId ? tabId(tabsId, value) : undefined}
      tabIndex={0}
      className={className}
    >
      {children}
    </div>
  );
}

const tabId = (base: string, value: string) => `${base}-tab-${value}`;
const panelId = (base: string, value: string) => `${base}-panel-${value}`;
