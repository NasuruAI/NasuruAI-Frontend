"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandLockup } from "@/components/ui/Brand";
import { ButtonLink } from "../Button";
import { SkipLink } from "../SkipLink";

const PUBLIC_PREFIXES = [
  "/ai/tools",
  "/ai/programs",
  "/ai/how-it-works",
  "/ai/how-ranking-works",
  "/ai/pricing",
  "/ai/changes",
  "/ai/countries",
  "/ai/guides",
  "/ai/scams",
  "/ai/trust",
  "/ai/share",
  "/ai/kit",
];

function isPublicPage(pathname: string): boolean {
  return (
    pathname === "/ai" ||
    PUBLIC_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
  );
}

function PublicHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-surface/95 shadow-e1 backdrop-blur">
      <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-2 px-4 sm:gap-4 sm:px-6">
        <Link href="/ai" aria-label="Nasuru AI home" className="shrink-0">
          <BrandLockup name="Nasuru AI" size="sm" className="whitespace-nowrap" />
        </Link>
        <nav aria-label="Main" className="hidden items-center gap-7 lg:flex">
          <Link
            href="/ai/tools"
            className="text-sm font-semibold text-muted transition hover:text-ink"
          >
            Free tools
          </Link>
          <Link
            href="/ai/programs"
            className="text-sm font-semibold text-muted transition hover:text-ink"
          >
            Programs
          </Link>
          <Link
            href="/ai/how-it-works"
            className="text-sm font-semibold text-muted transition hover:text-ink"
          >
            How it works
          </Link>
          <Link
            href="/ai/pricing"
            className="text-sm font-semibold text-muted transition hover:text-ink"
          >
            Pricing
          </Link>
        </nav>
        <div className="flex shrink-0 items-center gap-2 sm:gap-4">
          <Link
            href="/ai/login"
            className="rounded-full px-2 py-2 text-sm font-semibold whitespace-nowrap text-accent transition hover:bg-accent-soft sm:px-3"
          >
            Sign in
          </Link>
          <ButtonLink
            href="/ai/signup"
            variant="primary"
            size="sm"
            className="rounded-full px-3 sm:px-4"
          >
            Start free
          </ButtonLink>
        </div>
      </div>
    </header>
  );
}

function PublicFooter() {
  return (
    <footer className="border-t border-line bg-surface">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-7 text-sm text-muted sm:px-6">
        <Link href="/ai" aria-label="Nasuru AI home">
          <BrandLockup name="Nasuru AI" size="sm" className="whitespace-nowrap" />
        </Link>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-5 gap-y-2">
          <Link href="/ai/tools" className="transition hover:text-ink">
            Free tools
          </Link>
          <Link href="/ai/programs" className="transition hover:text-ink">
            Programs
          </Link>
          <Link href="/ai/how-ranking-works" className="transition hover:text-ink">
            How ranking works
          </Link>
          <Link href="/ai/trust" className="transition hover:text-ink">
            Trust &amp; sources
          </Link>
          <Link href="/ai/pricing" className="transition hover:text-ink">
            Pricing
          </Link>
          <Link href="/ai/login" className="transition hover:text-ink">
            Sign in
          </Link>
        </nav>
        <p className="w-full text-xs text-subtle sm:w-auto">
          Nasuru AI — your move abroad, checked.
        </p>
      </div>
    </footer>
  );
}

export function PublicAiChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPublic = isPublicPage(pathname);

  return (
    <>
      {isPublic && (
        <>
          <SkipLink />
          <PublicHeader />
        </>
      )}
      {children}
      {isPublic && <PublicFooter />}
    </>
  );
}
