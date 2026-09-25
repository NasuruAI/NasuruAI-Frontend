"use client";

/**
 * Buttons (design-system §8.1).
 *
 * One `primary` per view. Heights: sm 36, md 44, lg 52 (md is the minimum on
 * touch). Loading keeps the label and swaps the icon for a spinner, so the
 * width never jumps and a double tap cannot fire twice.
 */

import { Loader2 } from "lucide-react";
import Link from "next/link";
import { forwardRef } from "react";
import { cx } from "./cx";

export type ButtonVariant = "primary" | "secondary" | "tertiary" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-accent text-on-accent hover:bg-accent-hover",
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

function classes(variant: ButtonVariant, size: ButtonSize, extra?: string) {
  return cx(
    "inline-flex shrink-0 items-center justify-center rounded-r-md font-semibold whitespace-nowrap",
    "transition-colors duration-m-fast ease-m",
    "disabled:cursor-not-allowed disabled:opacity-50 aria-disabled:cursor-not-allowed aria-disabled:opacity-50",
    VARIANTS[variant],
    SIZES[size],
    extra,
  );
}

type Common = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Leading icon; replaced by a spinner while loading. */
  icon?: React.ReactNode;
  loading?: boolean;
};

export type ButtonProps = Common & React.ButtonHTMLAttributes<HTMLButtonElement>;

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "primary",
    size = "md",
    icon,
    loading = false,
    className,
    children,
    disabled,
    type,
    ...rest
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type ?? "button"}
      className={classes(variant, size, className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <Loader2 aria-hidden className="size-4 animate-spin" /> : icon}
      {children}
    </button>
  );
});

/** A link that looks like a button, for navigation actions ("See details"). */
export function ButtonLink({
  href,
  variant = "secondary",
  size = "md",
  icon,
  className,
  children,
  ...rest
}: Omit<Common, "loading"> &
  Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & { href: string }) {
  return (
    <Link href={href} className={classes(variant, size, className)} {...rest}>
      {icon}
      {children}
    </Link>
  );
}

export type IconButtonProps = Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "aria-label"> & {
  /** Required: an icon has no words, so this is what assistive tech reads. */
  label: string;
  variant?: "plain" | "outlined";
  selected?: boolean;
  children: React.ReactNode;
};

/** 44 × 44 hit area whatever the icon size. */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, variant = "plain", selected, className, children, type, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type ?? "button"}
      aria-label={label}
      aria-pressed={selected}
      title={label}
      className={cx(
        "inline-flex size-11 shrink-0 items-center justify-center rounded-r-md text-ink",
        "transition-colors duration-m-fast ease-m hover:bg-sunken",
        "disabled:cursor-not-allowed disabled:opacity-50",
        variant === "outlined" && "border border-field-line",
        selected && "bg-accent-soft text-accent",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
});
