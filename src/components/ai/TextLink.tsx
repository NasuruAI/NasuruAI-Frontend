import { ArrowRight, ExternalLink } from "lucide-react";
import Link from "next/link";
import { cx } from "./cx";

/**
 * Links (design-system §8.1): inline links are always underlined (offset 3,
 * thickness 1); `standalone` adds an arrow for "See details"-style links.
 * External links open in a new tab and say so.
 */
export function TextLink({
  href,
  standalone = false,
  external = false,
  className,
  children,
}: {
  href: string;
  standalone?: boolean;
  external?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const style = cx(
    "text-accent underline decoration-1 underline-offset-3 hover:text-accent-hover",
    standalone && "inline-flex items-center gap-1 font-semibold no-underline hover:underline",
    className,
  );
  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={style}>
        {children}
        <ExternalLink aria-hidden className="ml-0.5 inline size-3.5 align-[-2px]" />
        <span className="sr-only"> (opens in a new tab)</span>
      </a>
    );
  }
  return (
    <Link href={href} className={style}>
      {children}
      {standalone && <ArrowRight aria-hidden className="size-4" />}
    </Link>
  );
}
