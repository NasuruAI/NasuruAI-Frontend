"use client";

/**
 * Six-cell code entry (design-system §8.1).
 *
 * One real input carries `autocomplete="one-time-code"` so the phone can
 * offer the SMS code; the six cells are how it looks. Pasting a whole code
 * fills every cell, typing advances, Backspace goes back.
 */

import { useRef } from "react";
import { cx } from "./cx";

export function OTPInput({
  value,
  onChange,
  onComplete,
  length = 6,
  label = "Code",
  error,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  /** Called once when the last digit is entered. */
  onComplete?: (value: string) => void;
  length?: number;
  label?: string;
  error?: string;
  disabled?: boolean;
}) {
  const cells = useRef<Array<HTMLInputElement | null>>([]);
  const digits = value.padEnd(length, " ").slice(0, length).split("");

  function set(next: string) {
    const clean = next.replace(/\D/g, "").slice(0, length);
    onChange(clean);
    if (clean.length === length) onComplete?.(clean);
    return clean;
  }

  function onCellInput(index: number, raw: string) {
    const typed = raw.replace(/\D/g, "");
    if (!typed) return;
    if (typed.length > 1) {
      // Pasted or auto-filled: take the whole code from this cell onwards.
      const next = set(value.slice(0, index) + typed);
      cells.current[Math.min(next.length, length - 1)]?.focus();
      return;
    }
    const chars = value.split("");
    chars[index] = typed;
    set(chars.join("").slice(0, length));
    cells.current[Math.min(index + 1, length - 1)]?.focus();
  }

  function onKeyDown(index: number, event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Backspace") {
      event.preventDefault();
      if (value[index]) {
        set(value.slice(0, index) + value.slice(index + 1));
      } else if (index > 0) {
        set(value.slice(0, index - 1) + value.slice(index));
        cells.current[index - 1]?.focus();
      }
    } else if (event.key === "ArrowLeft" && index > 0) {
      cells.current[index - 1]?.focus();
    } else if (event.key === "ArrowRight" && index < length - 1) {
      cells.current[index + 1]?.focus();
    }
  }

  return (
    <fieldset>
      <legend className="mb-2 text-body-s font-semibold text-ink">{label}</legend>
      <div className="flex gap-2">
        {digits.map((digit, index) => (
          <input
            key={index}
            ref={(element) => {
              cells.current[index] = element;
            }}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={index === 0 ? length : 1}
            autoComplete={index === 0 ? "one-time-code" : "off"}
            disabled={disabled}
            aria-label={`Digit ${index + 1} of ${length}`}
            aria-invalid={error ? true : undefined}
            value={digit.trim()}
            onChange={(event) => onCellInput(index, event.target.value)}
            onKeyDown={(event) => onKeyDown(index, event)}
            onFocus={(event) => event.target.select()}
            className={cx(
              "h-14 w-12 rounded-r-sm border bg-surface text-center text-metric tabular-nums text-ink",
              "disabled:bg-sunken",
              error ? "border-danger" : "border-field-line",
            )}
          />
        ))}
      </div>
      {error && (
        <p role="alert" className="mt-2 text-body-s text-danger">
          {error}
        </p>
      )}
    </fieldset>
  );
}
