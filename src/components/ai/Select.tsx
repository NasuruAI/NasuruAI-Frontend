"use client";

/**
 * Select (native) and Combobox (design-system §8.1).
 *
 * Select wraps the platform control: best on phones, where the OS picker is
 * what people know. Combobox is for long or searched lists (occupations,
 * programmes): the WAI-ARIA 1.2 combobox pattern with `aria-activedescendant`,
 * so focus stays in the input while arrow keys move through the options.
 */

import { Check, ChevronDown, Loader2 } from "lucide-react";
import { forwardRef, useEffect, useId, useRef, useState } from "react";
import { cx } from "./cx";
import { FieldShell, type FieldShellProps, fieldBox } from "./fields";

export type SelectProps = FieldShellProps &
  React.SelectHTMLAttributes<HTMLSelectElement> & {
    options: { value: string; label: string }[];
    placeholder?: string;
  };

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, helper, error, hideLabel, optional, className, id, options, placeholder, ...select },
  ref,
) {
  return (
    <FieldShell {...{ label, helper, error, hideLabel, optional, className, id }}>
      {({ inputId, describedBy }) => (
        <div className="relative">
          <select
            ref={ref}
            id={inputId}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
            className={cx(
              fieldBox,
              "h-11 appearance-none pr-10",
              error ? "border-danger" : "border-field-line",
            )}
            {...select}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDown
            aria-hidden
            className="pointer-events-none absolute top-3 right-3 size-5 text-muted"
          />
        </div>
      )}
    </FieldShell>
  );
});

export type ComboboxOption = {
  value: string;
  label: string;
  /** Shown in mono beside the label, e.g. an occupation code. */
  code?: string;
  description?: string;
};

export function Combobox({
  label,
  helper,
  error,
  hideLabel,
  optional,
  className,
  value,
  onChange,
  search,
  placeholder,
  minChars = 2,
  noResults = "Nothing matches that.",
}: FieldShellProps & {
  value: ComboboxOption | null;
  onChange: (option: ComboboxOption | null) => void;
  /** Called (debounced) with the typed text; returns matching options. */
  search: (query: string) => Promise<ComboboxOption[]>;
  placeholder?: string;
  minChars?: number;
  noResults?: string;
}) {
  const listId = useId();
  const [query, setQuery] = useState(value?.label ?? "");
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<ComboboxOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(-1);
  const latest = useRef(0);

  useEffect(() => {
    if (!open || query.trim().length < minChars) return;
    const ticket = ++latest.current;
    const timer = setTimeout(() => {
      setLoading(true);
      search(query.trim())
        .then((found) => {
          if (ticket !== latest.current) return; // a newer search superseded this one
          setOptions(found);
          setActive(found.length ? 0 : -1);
        })
        .catch(() => {
          if (ticket === latest.current) setOptions([]);
        })
        .finally(() => {
          if (ticket === latest.current) setLoading(false);
        });
    }, 200);
    return () => clearTimeout(timer);
  }, [query, open, minChars, search]);

  function choose(option: ComboboxOption) {
    onChange(option);
    setQuery(option.label);
    setOpen(false);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setActive((index) => Math.min(index + 1, options.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter" && open && active >= 0 && options[active]) {
      event.preventDefault();
      choose(options[active]);
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  }

  const showList = open && query.trim().length >= minChars;
  const optionId = (index: number) => `${listId}-option-${index}`;

  return (
    <FieldShell {...{ label, helper, error, hideLabel, optional, className }}>
      {({ inputId, describedBy }) => (
        <div className="relative">
          <input
            id={inputId}
            type="text"
            role="combobox"
            aria-expanded={showList}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={showList && active >= 0 ? optionId(active) : undefined}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
            autoComplete="off"
            placeholder={placeholder}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setOpen(true);
              if (value) onChange(null);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 120)}
            onKeyDown={onKeyDown}
            className={cx(fieldBox, "h-11 pr-10", error ? "border-danger" : "border-field-line")}
          />
          {loading ? (
            <Loader2
              aria-hidden
              className="absolute top-3 right-3 size-5 animate-spin text-muted"
            />
          ) : (
            <ChevronDown
              aria-hidden
              className="pointer-events-none absolute top-3 right-3 size-5 text-muted"
            />
          )}
          <ul
            id={listId}
            role="listbox"
            aria-label={label}
            hidden={!showList}
            className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-r-md border border-line bg-surface py-1 shadow-e2"
          >
            {showList && !loading && options.length === 0 && (
              <li className="px-3 py-2.5 text-body-s text-muted">{noResults}</li>
            )}
            {options.map((option, index) => {
              const selected = value?.value === option.value;
              return (
                // Keyboard selection happens on the combobox input (arrow keys, Enter)
                // via aria-activedescendant, as the ARIA 1.2 pattern specifies.
                // eslint-disable-next-line jsx-a11y/click-events-have-key-events
                <li
                  key={option.value}
                  id={optionId(index)}
                  role="option"
                  aria-selected={selected}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => choose(option)}
                  onMouseEnter={() => setActive(index)}
                  className={cx(
                    "flex cursor-pointer items-start gap-2 px-3 py-2.5",
                    index === active && "bg-accent-soft",
                  )}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-body text-ink">
                      {option.label}
                      {option.code && (
                        <span className="ml-2 font-mono text-body-s text-muted">{option.code}</span>
                      )}
                    </span>
                    {option.description && (
                      <span className="block text-body-s text-muted">{option.description}</span>
                    )}
                  </span>
                  {selected && <Check aria-hidden className="mt-0.5 size-4 text-accent" />}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </FieldShell>
  );
}
