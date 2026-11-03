import {
  ArrowRight,
  BriefcaseBusiness,
  Globe,
  GraduationCap,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
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
    eyebrow: "Start here",
    icon: ShieldCheck,
    blurb:
      "Check which legal routes you qualify for in under two minutes. The honest answer first.",
  },
  {
    href: "/ai/tools/crs",
    title: POINTS_TOOLS.crs.title,
    eyebrow: "Canada",
    icon: Globe,
    blurb: POINTS_TOOLS.crs.blurb,
  },
  {
    href: "/ai/tools/opportunity-card",
    title: POINTS_TOOLS["opportunity-card"].title,
    eyebrow: "Germany",
    icon: Sparkles,
    blurb: POINTS_TOOLS["opportunity-card"].blurb,
  },
  {
    href: "/ai/tools/uk-points",
    title: POINTS_TOOLS["uk-points"].title,
    eyebrow: "United Kingdom",
    icon: BriefcaseBusiness,
    blurb: POINTS_TOOLS["uk-points"].blurb,
  },
  {
    href: "/ai/tools/grade-converter",
    title: "Grade converter",
    eyebrow: "Education",
    icon: GraduationCap,
    blurb:
      "Convert your Nigerian degree result to the UK and German scales, with the method shown.",
  },
];

export default function ToolsIndexPage() {
  return (
    <div className="min-h-screen bg-canvas">
      <main id="main" className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:py-16">
        <div className="rounded-r-lg border border-line bg-gradient-to-br from-brand-blue-soft via-surface to-brand-gold-soft p-6 sm:p-10 lg:p-12">
          <p className="text-overline font-bold tracking-[0.12em] text-brand-gold-deep uppercase">
            Free tools · no sign-up
          </p>
          <h1 className="mt-3 max-w-3xl font-display text-display-xl text-balance leading-[1.05] text-ink">
            Make your next move with better information.
          </h1>
          <p className="mt-4 max-w-2xl text-body-l leading-relaxed text-muted">
            Check your options, explore eligibility and understand the numbers. Every figure shows
            its source, and you can start without an account.
          </p>
        </div>

        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {TOOLS.map((tool) => (
            <li key={tool.href}>
              <Link
                href={tool.href}
                className="group flex h-full min-h-48 items-start gap-4 rounded-r-lg border border-line bg-surface p-5 shadow-e1 transition-[border-color,box-shadow,transform] duration-m-fast hover:-translate-y-0.5 hover:border-brand-blue-soft hover:shadow-e2 sm:p-6"
              >
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-blue-soft text-accent">
                  <tool.icon aria-hidden className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-overline font-bold tracking-[0.1em] text-brand-gold-deep uppercase">
                    {tool.eyebrow}
                  </span>
                  <h2 className="mt-1 flex items-start justify-between gap-2 font-display text-h4 text-ink">
                    <span>{tool.title}</span>
                    <ArrowRight
                      aria-hidden
                      className="mt-1 size-4 shrink-0 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-accent"
                    />
                  </h2>
                  <span className="mt-2 block text-body-s leading-relaxed text-muted">
                    {tool.blurb}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
