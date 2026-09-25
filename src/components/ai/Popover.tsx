"use client";

/**
 * Tooltip and Popover (design-system §8.1, web and extension only; mobile
 * uses a bottom sheet instead).
 *
 * Tooltip: shown on hover and keyboard focus, dismissed with Escape, and
 * wired with `aria-describedby`; never holds anything the user must act on.
 * Popover: a button-triggered panel for menus and short content. Escape and
 * an outside click close it, and focus goes back to the trigger.
 */

import { cloneElement, useCallback, useEffect, useId, useRef, useState } from "react";
import { cx } from "./cx";

export function Tooltip({
  content,
  children,
  side = "top",
}: {
  content: React.ReactNode;
  /** A single focusable element. */
  children: React.ReactElement<{ "aria-describedby"?: string }>;
  side?: "top" | "bottom";
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);
  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      {cloneElement(children, { "aria-describedby": id })}
      <span
        id={id}
        role="tooltip"
        hidden={!open}
        className={cx(
          "absolute left-1/2 z-30 w-max max-w-64 -translate-x-1/2 rounded-r-sm bg-ink px-2.5 py-1.5 text-caption text-ink-inverse shadow-e2",
          side === "top" ? "bottom-full mb-2" : "top-full mt-2",
        )}
      >
        {content}
      </span>
    </span>
  );
}

export function Popover({
  trigger,
  children,
  align = "start",
  label,
  className,
}: {
  /** Renders the trigger button; spread `props` onto it. */
  trigger: (props: {
    "aria-expanded": boolean;
    "aria-controls": string;
    "aria-haspopup": "dialog";
    onClick: () => void;
    ref: React.Ref<HTMLButtonElement>;
  }) => React.ReactNode;
  children: React.ReactNode | ((close: () => void) => React.ReactNode);
  align?: "start" | "end";
  /** Names the panel for assistive tech. */
  label: string;
  className?: string;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      close();
      // Escape is a deliberate close: focus goes back to where it came from.
      // A click elsewhere has already put focus where the person wanted it.
      triggerRef.current?.focus();
    }
    function onPointer(event: PointerEvent) {
      const target = event.target as Node;
      if (!panelRef.current?.contains(target) && !triggerRef.current?.contains(target)) close();
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    panelRef.current
      ?.querySelector<HTMLElement>("a, button, input, select, textarea, [tabindex]")
      ?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open, close]);

  return (
    <div className="relative inline-flex">
      {trigger({
        "aria-expanded": open,
        "aria-controls": id,
        "aria-haspopup": "dialog",
        onClick: () => setOpen((value) => !value),
        ref: triggerRef,
      })}
      <div
        ref={panelRef}
        id={id}
        role="dialog"
        aria-label={label}
        hidden={!open}
        className={cx(
          "absolute top-full z-30 mt-2 min-w-56 rounded-r-md border border-line bg-surface p-2 shadow-e2",
          align === "end" ? "right-0" : "left-0",
          className,
        )}
      >
        {open && (typeof children === "function" ? children(close) : children)}
      </div>
    </div>
  );
}
