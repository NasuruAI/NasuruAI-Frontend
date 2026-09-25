"use client";

/**
 * Dialog and Sheet (design-system §8.1), on the native <dialog> element.
 *
 * `showModal()` gives the top layer, a focus trap, an inert page behind and
 * Escape-to-close for free; hand-rolled overlays usually get one of those
 * wrong. Focus goes back to whatever was focused before opening. A click on
 * the scrim closes (the click lands on the <dialog> itself, outside the panel).
 */

import { X } from "lucide-react";
import { useEffect, useId, useRef } from "react";
import { Button, IconButton } from "./Button";
import { cx } from "./cx";

type Base = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: React.ReactNode;
  children?: React.ReactNode;
  footer?: React.ReactNode;
};

function useModal(open: boolean, onClose: () => void) {
  const ref = useRef<HTMLDialogElement>(null);
  const returnTo = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      returnTo.current = document.activeElement as HTMLElement | null;
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    // Escape fires `cancel`; let the parent decide by closing through state.
    const onCancel = (event: Event) => {
      event.preventDefault();
      onClose();
    };
    const onClosed = () => returnTo.current?.focus();
    dialog.addEventListener("cancel", onCancel);
    dialog.addEventListener("close", onClosed);
    return () => {
      dialog.removeEventListener("cancel", onCancel);
      dialog.removeEventListener("close", onClosed);
    };
  }, [onClose]);

  const onBackdrop = (event: React.MouseEvent<HTMLDialogElement>) => {
    if (event.target === event.currentTarget) onClose();
  };
  return { ref, onBackdrop };
}

export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
}: Base & { size?: "sm" | "md" | "lg" }) {
  const { ref, onBackdrop } = useModal(open, onClose);
  const titleId = useId();
  const descriptionId = useId();
  return (
    // Clicks on the <dialog> itself land on the scrim; the keyboard
    // equivalent is Escape, which the native element already handles.
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onClick={onBackdrop}
      className={cx(
        "m-auto w-[calc(100%-2rem)] rounded-r-lg border border-line bg-surface p-0 text-ink shadow-e3 backdrop:bg-scrim",
        size === "sm" && "max-w-sm",
        size === "md" && "max-w-lg",
        size === "lg" && "max-w-2xl",
      )}
    >
      {open && (
        <div className="flex max-h-[85vh] flex-col">
          <div className="flex items-start gap-3 px-6 pt-5 pb-3">
            <div className="min-w-0 flex-1">
              <h2 id={titleId} className="font-display text-h2 text-balance">
                {title}
              </h2>
              {description && (
                <p id={descriptionId} className="mt-1 text-body text-muted">
                  {description}
                </p>
              )}
            </div>
            <IconButton label="Close" onClick={onClose} className="-mt-1 -mr-2">
              <X aria-hidden className="size-5" />
            </IconButton>
          </div>
          {children && <div className="overflow-y-auto px-6 pb-2">{children}</div>}
          {footer && (
            <div className="flex flex-wrap justify-end gap-3 px-6 pt-3 pb-5">{footer}</div>
          )}
        </div>
      )}
    </dialog>
  );
}

/**
 * A confirm dialog. `destructive` makes the confirm button red; its label
 * should name the thing ("Archive your Canada pipeline?"), per the design system.
 */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancel",
  destructive = false,
  loading = false,
  children,
}: Omit<Base, "footer"> & {
  onConfirm: () => void;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            variant={destructive ? "danger" : "primary"}
            onClick={onConfirm}
            loading={loading}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      {children}
    </Dialog>
  );
}

/**
 * Side sheet on web (the `xl` context panel below `xl`, filters), bottom
 * sheet on small screens.
 */
export function Sheet({ open, onClose, title, description, children, footer }: Base) {
  const { ref, onBackdrop } = useModal(open, onClose);
  const titleId = useId();
  return (
    // Clicks on the <dialog> itself land on the scrim; the keyboard
    // equivalent is Escape, which the native element already handles.
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClick={onBackdrop}
      className={cx(
        "m-0 max-h-none max-w-none bg-surface p-0 text-ink shadow-e3 backdrop:bg-scrim",
        // Bottom sheet below md, right-hand side sheet from md.
        "fixed inset-x-0 top-auto bottom-0 w-full rounded-t-r-lg",
        "md:inset-y-0 md:right-0 md:left-auto md:h-full md:w-[400px] md:rounded-none md:border-l md:border-line",
      )}
    >
      {open && (
        <div className="flex max-h-[85vh] flex-col md:h-full md:max-h-none">
          <div aria-hidden className="mx-auto mt-2 h-1 w-10 rounded-full bg-line md:hidden" />
          <div className="flex items-start gap-3 border-b border-line px-5 py-4">
            <div className="min-w-0 flex-1">
              <h2 id={titleId} className="font-display text-h3">
                {title}
              </h2>
              {description && <p className="mt-1 text-body-s text-muted">{description}</p>}
            </div>
            <IconButton label="Close" onClick={onClose} className="-mt-2 -mr-2">
              <X aria-hidden className="size-5" />
            </IconButton>
          </div>
          <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
          {footer && <div className="flex gap-3 border-t border-line px-5 py-4">{footer}</div>}
        </div>
      )}
    </dialog>
  );
}
