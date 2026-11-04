import Image from "next/image";
import { cx } from "./cx";

type BrandMarkSize = "sm" | "md" | "lg";
const BRAND_LOGO_URL = "https://res.cloudinary.com/odpip1h9/image/upload/f_auto,q_auto/edu_logo";

const MARK_SIZES: Record<BrandMarkSize, string> = {
  sm: "size-10 rounded-r-sm",
  md: "size-11 rounded-r-md",
  lg: "size-14 rounded-r-md",
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
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden border border-brand-gold-line bg-white shadow-e1",
        MARK_SIZES[size],
        className,
      )}
    >
      <Image
        src={BRAND_LOGO_URL}
        alt=""
        width={2048}
        height={2048}
        sizes="56px"
        className="size-full object-cover"
      />
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
