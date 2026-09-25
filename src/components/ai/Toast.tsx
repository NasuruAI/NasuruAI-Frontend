"use client";

/**
 * Toast (design-system §8.1): ink surface, bottom-centre, 5 s, paused while
 * hovered or focused, optionally with one action ("Undo"). Announced politely
 * through the site's Announcer, whose live regions are always in the DOM.
 */

import { X } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useAnnouncer } from "@/components/ui/Announcer";

export const TOAST_MS = 5000;

type ToastInput = { message: string; action?: { label: string; onClick: () => void } };
type ToastItem = ToastInput & { id: number };

const ToastContext = createContext<((toast: ToastInput) => void) | null>(null);

export function useToast(): (toast: ToastInput) => void {
  const show = useContext(ToastContext);
  if (!show) throw new Error("useToast must be used inside <ToastProvider>.");
  return show;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const { announce } = useAnnouncer();
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback(
    (id: number) => setItems((list) => list.filter((item) => item.id !== id)),
    [],
  );
  const show = useCallback(
    (toast: ToastInput) => {
      const id = ++nextId.current;
      // At most two on screen: a third pushes the oldest out.
      setItems((list) => [...list.slice(-1), { ...toast, id }]);
      announce(
        toast.action ? `${toast.message}. ${toast.action.label} is available.` : toast.message,
      );
    },
    [announce],
  );
  const value = useMemo(() => show, [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4 sm:bottom-6">
        {items.map((item) => (
          <ToastCard key={item.id} item={item} onDismiss={() => dismiss(item.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastCard({ item, onDismiss }: { item: ToastItem; onDismiss: () => void }) {
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (paused) return;
    const timer = setTimeout(onDismiss, TOAST_MS);
    return () => clearTimeout(timer);
  }, [paused, onDismiss]);
  return (
    <div
      role="status"
      aria-live="off"
      className="pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-r-md bg-ink py-2 pr-2 pl-4 text-body text-ink-inverse shadow-e3"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <span className="min-w-0 flex-1">{item.message}</span>
      {item.action && (
        <button
          type="button"
          onClick={() => {
            item.action?.onClick();
            onDismiss();
          }}
          className="h-9 rounded-r-sm px-3 font-semibold text-ink-inverse underline underline-offset-3 hover:bg-white/10"
        >
          {item.action.label}
        </button>
      )}
      <button
        type="button"
        aria-label="Dismiss"
        onClick={onDismiss}
        className="flex size-9 items-center justify-center rounded-r-sm hover:bg-white/10"
      >
        <X aria-hidden className="size-4" />
      </button>
    </div>
  );
}
