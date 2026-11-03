import { cx } from "./cx";

type BrandMarkSize = "sm" | "md" | "lg";

const MARK_SIZES: Record<BrandMarkSize, string> = {
  sm: "size-8 rounded-r-sm",
  md: "size-9 rounded-r-md",
  lg: "size-11 rounded-r-md",
};

export function BrandMark({
  size = "md",
  className,
}: {
  size?: BrandMarkSize;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cx(
        "relative inline-flex shrink-0 items-center justify-center bg-gradient-to-br from-brand-blue to-brand-blue-deep text-on-accent shadow-e1",
        MARK_SIZES[size],
        className,
      )}
    >
      <svg viewBox="0 0 24 24" fill="none" className="size-[58%]">
        <path
          d="M5 18V6l7 8 7-8v12"
          stroke="currentColor"
          strokeWidth="2.3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className="absolute top-[18%] right-[16%] size-[18%] rounded-full bg-brand-gold" />
    </span>
  );
}

export function BrandLockup({
  name = "Nasuru",
  descriptor,
  size = "md",
  className,
}: {
  name?: string;
  descriptor?: string;
  size?: BrandMarkSize;
  className?: string;
}) {
  return (
    <span className={cx("inline-flex items-center gap-2.5", className)}>
      <BrandMark size={size} />
      <span className="min-w-0">
        <span className="block font-display text-lg leading-tight font-extrabold tracking-tight text-ink">
          {name}
        </span>
        {descriptor && (
          <span className="block text-caption leading-tight text-muted">{descriptor}</span>
        )}
      </span>
    </span>
  );
}
