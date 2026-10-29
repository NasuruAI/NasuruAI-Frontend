import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { SkipLink } from "@/components/ai/SkipLink";
import { POINTS_TOOLS } from "@/lib/ai/tools";

export const metadata = {
  title: "Free tools · Nasuru AI",
  description:
    "Free calculators and checkers for moving abroad: points scores, relocation costs, grade conversion and offer checks. No sign-up.",
};

const TOOLS = [
  {
    href: "/ai/tools/eligibility",
    title: "Am I eligible to move abroad?",
    blurb:
      "Check which legal routes you qualify for in under two minutes. The honest answer first.",
  },
  { href: "/ai/tools/crs", title: POINTS_TOOLS.crs.title, blurb: POINTS_TOOLS.crs.blurb },
  {
    href: "/ai/tools/opportunity-card",
    title: POINTS_TOOLS["opportunity-card"].title,
    blurb: POINTS_TOOLS["opportunity-card"].blurb,
  },
  {
    href: "/ai/tools/uk-points",
    title: POINTS_TOOLS["uk-points"].title,
    blurb: POINTS_TOOLS["uk-points"].blurb,
  },
  {
    href: "/ai/tools/grade-converter",
    title: "Grade converter",
    blurb:
      "Convert your Nigerian degree result to the UK and German scales, with the method shown.",
  },
];

export default function ToolsIndexPage() {
  return (
    <div className="min-h-screen bg-canvas">
      <SkipLink />
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link href="/ai/tools" className="font-display text-h4 text-ink">
            Nasuru<span className="text-muted"> AI</span>
          </Link>
          <Link href="/ai/login" className="text-body-s font-semibold text-accent hover:underline">
            Sign in
          </Link>
        </div>
      </header>

      <main id="main" className="mx-auto max-w-5xl px-4 py-10 lg:py-14">
        <p className="text-overline uppercase text-muted">Free tools</p>
        <h1 className="mt-1 font-display text-h1 text-balance text-ink">
          Check where you stand — free, no sign-up
        </h1>
        <p className="mt-3 max-w-2xl text-body-l text-muted">
          Every figure shows its source. Save your answers and get your full plan any time.
        </p>

        <ul className="mt-8 grid gap-4 sm:grid-cols-2">
          {TOOLS.map((tool) => (
            <li key={tool.href}>
              <Link
                href={tool.href}
                className="group block h-full rounded-r-md border border-line bg-surface p-5 transition-colors hover:border-line-strong"
              >
                <h2 className="flex items-center gap-1.5 font-display text-h4 text-ink">
                  {tool.title}
                  <ArrowRight
                    aria-hidden
                    className="size-4 text-muted transition-transform group-hover:translate-x-0.5"
                  />
                </h2>
                <p className="mt-2 text-body-s text-muted">{tool.blurb}</p>
              </Link>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
