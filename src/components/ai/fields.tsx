"use client";

/**
 * Text inputs (design-system §8.1).
 *
 * The label sits above the field, never inside it as a placeholder. Helper and
 * error text sit below; an error adds an icon and a `danger` border, and is
 * tied to the input with `aria-describedby` so it is read with the field.
 * Inputs are 16 px minimum everywhere (prevents iOS zoom).
 */

import { CircleAlert } from "lucide-react";
import { forwardRef, useId } from "react";
import { cx } from "./cx";

/**
 * Shared field styling, without width or background: two utilities of one
 * property on one element resolve by stylesheet order, not class order, so
 * each control states its own (see `fieldBox`).
 */
export const fieldControl = cx(
  "rounded-r-sm border px-3 text-body text-ink",
  "placeholder:text-subtle transition-colors duration-m-fast ease-m",
  "hover:border-line-strong disabled:cursor-not-allowed disabled:bg-sunken disabled:text-muted",
  // Only text controls: browsers also count <select> as :read-only.
  "[&:is(input,textarea):read-only]:bg-sunken",
);

/** The usual full-width field on a white surface. */
export const fieldBox = cx(fieldControl, "w-full bg-surface");

export type FieldShellProps = {
  label: string;
  helper?: React.ReactNode;
  error?: string;
  /** Visually hide the label (it is still read). For search boxes with an icon. */
  hideLabel?: boolean;
  optional?: boolean;
  className?: string;
};

type ShellIds = { inputId: string; describedBy: string | undefined };

export function FieldShell({
  label,
  helper,
  error,
  hideLabel,
  optional,
  className,
  id,
  children,
  trailing,
}: FieldShellProps & {
  id?: string;
  children: (ids: ShellIds) => React.ReactNode;
  /** Right-aligned beside the label, e.g. a character counter. */
  trailing?: React.ReactNode;
}) {
  const generated = useId();
  const inputId = id ?? generated;
  const helperId = `${inputId}-helper`;
  const errorId = `${inputId}-error`;
  const describedBy = [error ? errorId : null, helper ? helperId : null].filter(Boolean).join(" ");
  return (
    <div className={cx("space-y-1.5", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <label
          htmlFor={inputId}
          className={cx("text-body-s font-semibold text-ink", hideLabel && "sr-only")}
        >
          {label}
          {optional && <span className="font-normal text-muted"> (optional)</span>}
        </label>
        {trailing}
      </div>
      {children({ inputId, describedBy: describedBy || undefined })}
      {error && (
        <p id={errorId} className="flex items-start gap-1.5 text-body-s text-danger">
          <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
          {error}
        </p>
      )}
      {helper && (
        <p id={helperId} className="text-body-s text-muted">
          {helper}
        </p>
      )}
    </div>
  );
}

export type TextFieldProps = FieldShellProps &
  Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> & {
    /** Something inside the field before the text, e.g. a search icon. */
    leading?: React.ReactNode;
  };

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { label, helper, error, hideLabel, optional, className, id, leading, ...input },
  ref,
) {
  return (
    <FieldShell {...{ label, helper, error, hideLabel, optional, className, id }}>
      {({ inputId, describedBy }) => (
        <div className="relative">
          {leading && (
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted">
              {leading}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
            className={cx(
              fieldBox,
              "h-11",
              leading && "pl-10",
              error ? "border-danger" : "border-field-line",
            )}
            {...input}
          />
        </div>
      )}
    </FieldShell>
  );
});

/** Country dialling codes offered beside a phone number. Nigeria first. */
export const DIAL_CODES = [
  { code: "+234", country: "NG", name: "Nigeria" },
  { code: "+233", country: "GH", name: "Ghana" },
  { code: "+254", country: "KE", name: "Kenya" },
  { code: "+44", country: "GB", name: "United Kingdom" },
  { code: "+1", country: "US", name: "United States or Canada" },
  { code: "+49", country: "DE", name: "Germany" },
  { code: "+353", country: "IE", name: "Ireland" },
  { code: "+31", country: "NL", name: "Netherlands" },
  { code: "+41", country: "CH", name: "Switzerland" },
] as const;

export type PhoneValue = { dialCode: string; number: string };

/** The number as the API wants it: dial code plus digits, spaces removed. */
export function phoneToE164Input({ dialCode, number }: PhoneValue): string {
  const digits = number.replace(/[^\d]/g, "");
  // "0803…" typed after +234 is the local form: the leading 0 is a trunk prefix.
  return `${dialCode}${digits.replace(/^0+/, "")}`;
}

export function PhoneField({
  label,
  helper,
  error,
  optional,
  className,
  id,
  value,
  onChange,
  disabled,
}: FieldShellProps & {
  id?: string;
  value: PhoneValue;
  onChange: (value: PhoneValue) => void;
  disabled?: boolean;
}) {
  return (
    <FieldShell {...{ label, helper, error, optional, className, id }}>
      {({ inputId, describedBy }) => (
        <div className="flex gap-2">
          <select
            aria-label="Country code"
            value={value.dialCode}
            disabled={disabled}
            onChange={(event) => onChange({ ...value, dialCode: event.target.value })}
            className={cx(fieldControl, "h-11 w-28 shrink-0 border-field-line bg-surface pr-2")}
          >
            {DIAL_CODES.map((option) => (
              <option key={option.code + option.country} value={option.code}>
                {option.country} {option.code}
              </option>
            ))}
          </select>
          <input
            id={inputId}
            type="tel"
            inputMode="tel"
            autoComplete="tel-national"
            disabled={disabled}
            value={value.number}
            onChange={(event) => onChange({ ...value, number: event.target.value })}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
            placeholder="803 123 4567"
            className={cx(
              fieldControl,
              "h-11 min-w-0 flex-1 bg-surface",
              error ? "border-danger" : "border-field-line",
            )}
          />
        </div>
      )}
    </FieldShell>
  );
}

/** Counter tone: `warning` from 90% of the limit, `danger` over it. */
export function counterTone(length: number, max: number): "ok" | "warning" | "danger" {
  if (length > max) return "danger";
  if (length >= Math.ceil(max * 0.9)) return "warning";
  return "ok";
}

export type TextAreaProps = FieldShellProps &
  React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
    /** The limit the counter shows, e.g. the ATS field's exact maxlength. */
    maxChars?: number;
  };

/**
 * A text area whose counter matches the target limit exactly ("412 / 500").
 * Going over is allowed while typing, so a paste isn't silently cut, and the
 * counter turns red and says so.
 */
export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(function TextArea(
  { label, helper, error, hideLabel, optional, className, id, maxChars, value, rows = 4, ...area },
  ref,
) {
  const length = typeof value === "string" ? value.length : 0;
  const tone = maxChars ? counterTone(length, maxChars) : "ok";
  const counter = maxChars ? (
    <span
      className={cx(
        "text-metric-s tabular-nums",
        tone === "ok" && "text-muted",
        tone === "warning" && "text-warning",
        tone === "danger" && "text-danger",
      )}
      aria-live={tone === "ok" ? undefined : "polite"}
    >
      {length} / {maxChars}
      {tone === "danger" && <span className="sr-only"> — {length - maxChars} over the limit</span>}
    </span>
  ) : undefined;
  return (
    <FieldShell
      {...{ label, helper, error, hideLabel, optional, className, id }}
      trailing={counter}
    >
      {({ inputId, describedBy }) => (
        <textarea
          ref={ref}
          id={inputId}
          rows={rows}
          value={value}
          aria-invalid={error || tone === "danger" ? true : undefined}
          aria-describedby={describedBy}
          className={cx(
            fieldBox,
            "py-2.5",
            error || tone === "danger" ? "border-danger" : "border-field-line",
          )}
          {...area}
        />
      )}
    </FieldShell>
  );
});
