"use client";

/**
 * The app's announcement layer.
 *
 * Nothing in this product used to announce asynchronous outcomes: a document
 * upload succeeding, a checklist re-syncing, a payment verifying — all changed
 * the screen silently, which is WCAG 4.1.3 (§B4).
 *
 * Two surfaces, one API:
 *
 *   announce("Passport uploaded")            — screen-reader only
 *   toast("Passport uploaded")               — visible AND announced
 *
 * The live regions are rendered once, at the root, and are always present in
 * the DOM. That matters: a region inserted at the same moment as its text is
 * frequently missed, because assistive technology watches existing regions for
 * changes rather than scanning for new ones.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { API_ERROR_TOAST_EVENT } from "@/lib/api";

type Tone = "info" | "success" | "error";

interface Toast {
  id: number;
  message: string;
  tone: Tone;
}

interface AnnouncerValue {
  /** Announce without showing anything. For routine, expected changes. */
  announce: (message: string, assertive?: boolean) => void;
  /** Show a dismissible message and announce it. */
  toast: (message: string, tone?: Tone) => void;
}

const AnnouncerContext = createContext<AnnouncerValue | null>(null);

const TONE_STYLES: Record<Tone, string> = {
  info: "border-info-line bg-info-bg text-info",
  success: "border-success-line bg-success-bg text-success",
  error: "border-danger-line bg-danger-bg text-danger",
};

export function AnnouncerProvider({ children }: { children: React.ReactNode }) {
  const [polite, setPolite] = useState("");
  const [assertive, setAssertive] = useState("");
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);
  const activeToasts = useRef(new Set<string>());
  const toastsById = useRef(new Map<number, Toast>());

  const announce = useCallback((message: string, isAssertive = false) => {
    const set = isAssertive ? setAssertive : setPolite;
    // Clearing first guarantees a change event even when the same message is
    // announced twice in a row —"Saved", then"Saved" again.
    set("");
    requestAnimationFrame(() => set(message));
  }, []);

  const toast = useCallback(
    (message: string, tone: Tone = "info") => {
      const key = `${tone}:${message}`;
      if (activeToasts.current.has(key)) return;
      activeToasts.current.add(key);
      const id = nextId.current++;
      const item = { id, message, tone };
      toastsById.current.set(id, item);
      setToasts((current) => [...current, item]);
      announce(message, tone === "error");
    },
    [announce],
  );

  useEffect(() => {
    const onApiError = (event: Event) => {
      const { message, tone } = (event as CustomEvent<{ message: string; tone: Tone }>).detail;
      toast(message, tone);
    };

    window.addEventListener(API_ERROR_TOAST_EVENT, onApiError);
    return () => window.removeEventListener(API_ERROR_TOAST_EVENT, onApiError);
  }, [toast]);

  const dismiss = useCallback((id: number) => {
    const dismissed = toastsById.current.get(id);
    if (dismissed) activeToasts.current.delete(`${dismissed.tone}:${dismissed.message}`);
    toastsById.current.delete(id);
    setToasts((current) => current.filter((item) => item.id !== id));
  }, []);

  const value = useMemo(() => ({ announce, toast }), [announce, toast]);

  return (
    <AnnouncerContext.Provider value={value}>
      {children}

      {/* Always mounted, never conditionally rendered. */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {polite}
      </div>
      <div aria-live="assertive" aria-atomic="true" className="sr-only">
        {assertive}
      </div>

      {toasts.length > 0 && (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2 p-4 sm:items-end">
          {toasts.map((item) => (
            <ToastCard key={item.id} toast={item} dismiss={dismiss} />
          ))}
        </div>
      )}
    </AnnouncerContext.Provider>
  );
}

function ToastCard({ toast, dismiss }: { toast: Toast; dismiss: (id: number) => void }) {
  useEffect(() => {
    const timer = setTimeout(() => dismiss(toast.id), 5000);
    return () => clearTimeout(timer);
  }, [dismiss, toast.id]);

  return (
    <div
      className={`pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-lg border px-4 py-3 text-sm shadow-lg ${
        TONE_STYLES[toast.tone]
      }`}
    >
      {/* The text is already announced through the live region above, so the
          visible copy is hidden from assistive tech to avoid saying it twice. */}
      <span aria-hidden="true" className="flex-1">
        {toast.message}
      </span>
      <button
        type="button"
        onClick={() => dismiss(toast.id)}
        className="shrink-0 rounded opacity-70 transition hover:opacity-100"
      >
        <span aria-hidden="true">×</span>
        <span className="sr-only">Dismiss: {toast.message}</span>
      </button>
    </div>
  );
}

export function useAnnouncer(): AnnouncerValue {
  const context = useContext(AnnouncerContext);
  if (!context) throw new Error("useAnnouncer must be used inside an AnnouncerProvider.");
  return context;
}
