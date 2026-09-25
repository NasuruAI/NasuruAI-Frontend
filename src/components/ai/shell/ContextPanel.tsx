"use client";

/**
 * The right-hand context panel (web.md §1.1): evidence for the selected item
 * (a job's trust checks, the fact behind an answer). At `xl` it sits beside
 * the content; below `xl` the same content opens in a side sheet.
 *
 * Pages render <ContextPanel> wherever it is convenient; the shell owns where
 * it appears.
 */

import { createContext, useContext, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { Sheet } from "../Dialog";

const XL = "(min-width: 1280px)";

function subscribeXl(callback: () => void) {
  const query = window.matchMedia(XL);
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}

export function useIsXl(): boolean {
  return useSyncExternalStore(
    subscribeXl,
    () => window.matchMedia(XL).matches,
    () => false,
  );
}

const SlotContext = createContext<HTMLElement | null>(null);

/** Provided by the shell: the <aside> the panel renders into at xl. */
export function ContextPanelSlot({
  children,
}: {
  children: (setSlot: (element: HTMLElement | null) => void) => React.ReactNode;
}) {
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  return <SlotContext.Provider value={slot}>{children(setSlot)}</SlotContext.Provider>;
}

export function ContextPanel({
  title,
  open,
  onClose,
  children,
}: {
  title: string;
  /** Below xl: whether the sheet is open. At xl the panel always shows. */
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const slot = useContext(SlotContext);
  const xl = useIsXl();
  if (xl && slot) {
    return createPortal(
      <section aria-label={title} className="p-5">
        <h2 className="mb-3 text-overline text-muted uppercase">{title}</h2>
        {children}
      </section>,
      slot,
    );
  }
  return (
    <Sheet open={open} onClose={onClose} title={title}>
      {children}
    </Sheet>
  );
}
