import { cx } from "./cx";

export type ButtonVariant = "primary" | "secondary" | "tertiary" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-accent text-on-accent shadow-e1 hover:bg-accent-hover",
  secondary:
    "border border-field-line bg-surface text-ink hover:border-line-strong hover:bg-sunken",
  tertiary: "text-accent hover:bg-accent-soft",
  danger: "bg-danger text-on-danger hover:opacity-90",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "h-9 gap-1.5 px-3 text-body-s",
  md: "h-11 gap-2 px-4 text-body",
  lg: "h-13 gap-2 px-5 text-body-l",
};

export function buttonClasses(
  variant: ButtonVariant = "primary",
  size: ButtonSize = "md",
  className?: string,
): string {
  return cx(
    "inline-flex shrink-0 items-center justify-center rounded-r-md font-semibold whitespace-nowrap",
    "transition-colors duration-m-fast ease-m",
    "disabled:cursor-not-allowed disabled:opacity-50 aria-disabled:cursor-not-allowed aria-disabled:opacity-50",
    VARIANTS[variant],
    SIZES[size],
    className,
  );
}
