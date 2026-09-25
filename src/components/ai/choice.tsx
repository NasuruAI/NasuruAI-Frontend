"use client";

/**
 * Choice controls (design-system §8.1): 24 px control, 44 px row. Built on
 * native inputs, so keyboard, form and screen-reader behaviour are the
 * platform's own.
 */

import { Check, Minus } from "lucide-react";
import { useEffect, useId, useRef } from "react";
import { cx } from "./cx";

export function Checkbox({
  label,
  description,
  checked,
  indeterminate = false,
  onChange,
  disabled,
  className,
}: {
  label: React.ReactNode;
  description?: React.ReactNode;
  checked: boolean;
  indeterminate?: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const id = useId();
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);
  const on = checked || indeterminate;
  return (
    <label
      htmlFor={id}
      className={cx(
        "flex min-h-11 cursor-pointer items-start gap-3 py-2.5",
        disabled && "cursor-not-allowed opacity-50",
        className,
      )}
    >
      <span className="relative mt-px flex size-6 shrink-0 items-center justify-center">
        <input
          ref={ref}
          id={id}
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(event) => onChange(event.target.checked)}
          aria-describedby={description ? `${id}-description` : undefined}
          className={cx(
            "peer size-6 cursor-pointer appearance-none rounded-r-sm border",
            on ? "border-accent bg-accent" : "border-field-line bg-surface",
          )}
        />
        {indeterminate ? (
          <Minus aria-hidden className="pointer-events-none absolute size-4 text-on-accent" />
        ) : (
          checked && (
            <Check aria-hidden className="pointer-events-none absolute size-4 text-on-accent" />
          )
        )}
      </span>
      <span className="text-body text-ink">
        {label}
        {description && (
          <span id={`${id}-description`} className="block text-body-s text-muted">
            {description}
          </span>
        )}
      </span>
    </label>
  );
}

export type RadioOption<T extends string> = {
  value: T;
  label: React.ReactNode;
  description?: React.ReactNode;
};

export function RadioGroup<T extends string>({
  legend,
  name,
  value,
  options,
  onChange,
  hideLegend,
  className,
}: {
  legend: string;
  name?: string;
  value: T | null;
  options: RadioOption<T>[];
  onChange: (value: T) => void;
  hideLegend?: boolean;
  className?: string;
}) {
  const generated = useId();
  const group = name ?? generated;
  return (
    <fieldset className={className}>
      <legend className={cx("mb-1 text-body-s font-semibold text-ink", hideLegend && "sr-only")}>
        {legend}
      </legend>
      {options.map((option) => {
        const id = `${group}-${option.value}`;
        const selected = value === option.value;
        return (
          <label
            key={option.value}
            htmlFor={id}
            className="flex min-h-11 cursor-pointer items-start gap-3 py-2.5"
          >
            <span className="relative mt-px flex size-6 shrink-0 items-center justify-center">
              <input
                id={id}
                type="radio"
                name={group}
                value={option.value}
                checked={selected}
                onChange={() => onChange(option.value)}
                className={cx(
                  "size-6 cursor-pointer appearance-none rounded-full border bg-surface",
                  selected ? "border-accent" : "border-field-line",
                )}
              />
              {selected && (
                <span
                  aria-hidden
                  className="pointer-events-none absolute size-3 rounded-full bg-accent"
                />
              )}
            </span>
            <span className="text-body text-ink">
              {option.label}
              {option.description && (
                <span className="block text-body-s text-muted">{option.description}</span>
              )}
            </span>
          </label>
        );
      })}
    </fieldset>
  );
}

export function Switch({
  label,
  description,
  checked,
  onChange,
  disabled,
  className,
}: {
  label: React.ReactNode;
  description?: React.ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}) {
  const id = useId();
  return (
    <div className={cx("flex min-h-11 items-center justify-between gap-4 py-2", className)}>
      <label htmlFor={id} className="text-body text-ink">
        {label}
        {description && <span className="block text-body-s text-muted">{description}</span>}
      </label>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cx(
          "relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition-colors duration-m-fast ease-m",
          "disabled:cursor-not-allowed disabled:opacity-50",
          checked ? "border-accent bg-accent" : "border-field-line bg-sunken",
        )}
      >
        <span
          aria-hidden
          className={cx(
            "inline-block size-5 rounded-full bg-surface shadow-e1 transition-transform duration-m-fast ease-m",
            checked ? "translate-x-6" : "translate-x-1",
          )}
        />
      </button>
    </div>
  );
}

/**
 * 2-4 exclusive options shown side by side (currency, time range, preview
 * mode). A radio group underneath, so arrow keys move between options.
 */
export function SegmentedControl<T extends string>({
  label,
  value,
  options,
  onChange,
  className,
}: {
  label: string;
  value: T;
  options: { value: T; label: React.ReactNode }[];
  onChange: (value: T) => void;
  className?: string;
}) {
  const group = useId();
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cx("inline-flex rounded-r-md border border-field-line bg-sunken p-0.5", className)}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <label
            key={option.value}
            className={cx(
              "relative flex h-9 cursor-pointer items-center rounded-r-sm px-3 text-body-s font-semibold transition-colors duration-m-fast ease-m",
              "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-focus",
              selected ? "bg-surface text-ink shadow-e1" : "text-muted hover:text-ink",
            )}
          >
            <input
              type="radio"
              name={group}
              value={option.value}
              checked={selected}
              onChange={() => onChange(option.value)}
              className="sr-only"
            />
            {option.label}
          </label>
        );
      })}
    </div>
  );
}
