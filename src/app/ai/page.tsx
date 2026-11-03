import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  BriefcaseBusiness,
  Check,
  FileCheck,
  Globe,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { ButtonLink } from "@/components/ai/Button";
import { BrandLockup } from "@/components/ui/Brand";

export const metadata = {
  title: "Nasuru AI — know your real route abroad",
  description:
    "Check the visas you actually qualify for, see only employers who can truly sponsor you, and get every application answer prepared. Free to start, no card.",
};

const PROMISES = [
  "We never guarantee a visa.",
  "We never charge you for a job or an introduction.",
  "We never log into your accounts.",
  "We never press submit for you.",
];

const TOOLS = [
  {
    href: "/ai/tools/eligibility",
    label: "Visa eligibility",
    description: "See which routes may fit your profile.",
    icon: ShieldCheck,
  },
  {
    href: "/ai/tools/crs",
    label: "Canada CRS score",
    description: "Estimate your Express Entry score.",
    icon: Globe,
  },
  {
    href: "/ai/tools/opportunity-card",
    label: "Germany Opportunity Card",
    description: "Review the points-based route.",
    icon: Sparkles,
  },
  {
    href: "/ai/tools/uk-points",
    label: "UK Skilled Worker",
    description: "Check the route requirements.",
    icon: BriefcaseBusiness,
  },
  {
    href: "/ai/tools/grade-converter",
    label: "Grade converter",
    description: "Make sense of your qualifications.",
    icon: FileCheck,
  },
];

const STEPS = [
  { icon: Search, title: "Tell us about you", line: "A few questions. No documents to start." },
  {
    icon: Sparkles,
    title: "See your real routes",
    line: "Routes that may fit your profile — the honest answer first.",
  },
  {
    icon: FileCheck,
    title: "Get every answer ready",
    line: "Forms, letters and checks prepared. You submit.",
  },
];

const PLANS = [
  { name: "Free", line: "Check eligibility, routes and jobs." },
  { name: "Plus", line: "Tailored CVs and more, each month." },
  { name: "Pro", line: "Unlimited packs, coaching, the extension." },
];

export default function AiLandingPage() {
  return (
    <div className="bg-canvas text-ink">
      <main id="main">
        {/* Hero */}
        <section className="relative isolate overflow-hidden border-b border-line bg-canvas">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-40 right-[-8rem] -z-10 size-[34rem] rounded-full bg-brand-blue-soft/70 blur-3xl"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute top-72 right-[35%] -z-10 size-56 rounded-full bg-brand-gold-soft/80 blur-3xl"
          />
          <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[1fr_0.92fr] lg:gap-14 lg:py-24">
            <div className="max-w-2xl">
              <p className="inline-flex items-center gap-2 rounded-full border border-brand-gold-line bg-brand-gold-soft px-3.5 py-1.5 text-xs font-bold tracking-[0.12em] text-brand-gold-deep uppercase">
                <span aria-hidden="true" className="size-1.5 rounded-full bg-brand-gold" />
                Japa — done honestly
              </p>
              <h1 className="mt-6 font-display text-5xl leading-[1.03] font-extrabold tracking-[-0.045em] text-balance sm:text-6xl lg:text-7xl">
                Your move abroad, made clearer.
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-8 text-muted sm:text-xl">
                Check which routes may fit, compare your options and prepare your application—with
                guidance grounded in sources you can verify.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <ButtonLink
                  href="/ai/tools/eligibility"
                  variant="primary"
                  size="lg"
                  icon={<ArrowRight aria-hidden className="size-4" />}
                  className="h-14 rounded-full px-6 text-base shadow-e2"
                >
                  Check eligibility — free
                </ButtonLink>
                <ButtonLink
                  href="/ai/tools"
                  size="lg"
                  variant="secondary"
                  icon={<ArrowDown aria-hidden className="size-4 text-accent" />}
                  className="h-14 rounded-full border-line bg-surface px-6 text-base"
                >
                  Explore free tools
                </ButtonLink>
              </div>
              <p className="mt-4 text-sm text-subtle">
                No account needed to start. No card. You stay in control.
              </p>
            </div>

            <div className="relative mx-auto w-full max-w-[34rem] lg:ml-auto">
              <div
                aria-hidden="true"
                className="absolute -inset-4 rounded-[2rem] bg-gradient-to-br from-brand-blue-soft via-surface to-brand-gold-soft"
              />
              <div className="relative rounded-[1.75rem] border border-line bg-surface p-3 shadow-e3 sm:p-4">
                <div className="overflow-hidden rounded-[1.25rem] border border-line bg-canvas">
                  <div className="flex items-center justify-between border-b border-line bg-surface px-5 py-4">
                    <div className="flex items-center gap-3">
                      <BrandLockup name="Nasuru AI" size="sm" />
                      <span className="hidden h-7 w-px bg-line sm:inline" />
                      <span className="hidden text-sm font-semibold text-muted sm:inline">
                        Your workspace
                      </span>
                    </div>
                    <span className="rounded-full border border-brand-gold-line bg-brand-gold-soft px-2.5 py-1 text-[11px] font-semibold text-brand-gold-deep">
                      Example
                    </span>
                  </div>

                  <div className="p-5 sm:p-6">
                    <div className="rounded-2xl bg-brand-blue-deep p-5 text-ink-inverse sm:p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-xs font-semibold tracking-[0.12em] text-ink-inverse/70 uppercase">
                            Your options
                          </p>
                          <p className="font-display mt-2 text-xl leading-snug font-bold sm:text-2xl">
                            Understand the route before you take it.
                          </p>
                        </div>
                        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-ink-inverse/10">
                          <Globe aria-hidden className="size-6" />
                        </span>
                      </div>
                      <div className="mt-6 flex items-center gap-3">
                        <span className="grid size-7 place-items-center rounded-full bg-brand-gold text-brand-blue-deep">
                          <Check aria-hidden className="size-4" strokeWidth={3} />
                        </span>
                        <span className="h-px flex-1 bg-ink-inverse/25" />
                        <span className="grid size-7 place-items-center rounded-full border border-ink-inverse/35 text-xs font-bold">
                          2
                        </span>
                        <span className="h-px flex-1 bg-ink-inverse/25" />
                        <span className="grid size-7 place-items-center rounded-full border border-ink-inverse/35 text-xs font-bold">
                          3
                        </span>
                      </div>
                      <div className="mt-3 flex justify-between text-[11px] font-medium text-ink-inverse/70">
                        <span>Check eligibility</span>
                        <span>Compare routes</span>
                        <span>Prepare answers</span>
                      </div>
                    </div>

                    <div className="mt-5">
                      <div className="mb-3 flex items-center justify-between">
                        <p className="font-display font-bold">Start with what matters</p>
                        <span className="text-xs font-medium text-subtle">Free to explore</span>
                      </div>
                      <ul className="space-y-2.5">
                        <li className="flex items-center gap-3 rounded-xl border border-brand-blue-soft bg-brand-blue-soft/45 p-3.5">
                          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-surface text-accent shadow-e1">
                            <ShieldCheck aria-hidden className="size-4.5" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-semibold">Check eligibility</span>
                            <span className="mt-0.5 block text-xs text-muted">
                              Understand what may fit your profile
                            </span>
                          </span>
                          <ArrowRight aria-hidden className="size-4 text-subtle" />
                        </li>
                        <li className="flex items-center gap-3 rounded-xl border border-line bg-surface p-3.5">
                          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand-gold-soft text-brand-gold-deep">
                            <BriefcaseBusiness aria-hidden className="size-4.5" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-semibold">
                              Explore sponsor jobs
                            </span>
                            <span className="mt-0.5 block text-xs text-muted">
                              Search roles with clear requirements
                            </span>
                          </span>
                          <ArrowRight aria-hidden className="size-4 text-subtle" />
                        </li>
                      </ul>
                    </div>

                    <div className="mt-5 flex items-center gap-2 border-t border-line pt-4 text-xs leading-relaxed text-subtle">
                      <ShieldCheck aria-hidden className="size-4 shrink-0 text-accent" />
                      Sources shown. You decide. You submit.
                    </div>
                  </div>
                </div>
              </div>
              <div
                aria-hidden="true"
                className="absolute -right-3 -bottom-5 hidden items-center gap-2 rounded-2xl border border-line bg-surface px-4 py-3 shadow-e2 sm:flex"
              >
                <span className="grid size-8 place-items-center rounded-full bg-brand-gold-soft text-brand-gold-deep">
                  <Check aria-hidden className="size-4" strokeWidth={2.5} />
                </span>
                <span className="text-sm font-semibold">No job fees. Ever.</span>
              </div>
            </div>
          </div>
        </section>

        <section aria-label="How we work" className="border-b border-line bg-sunken">
          <div className="mx-auto grid max-w-7xl gap-0 px-4 sm:grid-cols-3 sm:px-6">
            {[
              {
                icon: ShieldCheck,
                title: "No false promises",
                text: "No one can guarantee your visa or a job.",
              },
              {
                icon: BriefcaseBusiness,
                title: "No job fees",
                text: "We never charge for a job or introduction.",
              },
              {
                icon: Check,
                title: "You stay in control",
                text: "You review everything and press submit.",
              },
            ].map((item, index) => (
              <div
                key={item.title}
                className={`flex items-start gap-3 py-5 sm:py-6 ${
                  index < 2 ? "border-b border-line sm:border-r sm:border-b-0 sm:pr-6" : ""
                } ${index > 0 ? "sm:pl-6" : ""}`}
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-surface text-accent shadow-e1">
                  <item.icon aria-hidden className="size-4.5" />
                </span>
                <div>
                  <p className="font-semibold">{item.title}</p>
                  <p className="mt-0.5 text-sm text-muted">{item.text}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* What we won't do — the trust block */}
        <section className="bg-canvas">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20">
            <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
              <div>
                <p className="text-overline font-bold tracking-[0.12em] text-brand-gold-deep uppercase">
                  Built around your control
                </p>
                <h2 className="mt-3 max-w-lg font-display text-3xl leading-tight font-bold tracking-tight text-balance sm:text-4xl">
                  No shortcuts with your future.
                </h2>
                <p className="mt-4 max-w-md text-body-l leading-relaxed text-muted">
                  Immigration is too important for vague promises. We show what we can do, what we
                  can&apos;t, and where the rules come from.
                </p>
              </div>
              <ul className="grid gap-3 sm:grid-cols-2">
                {PROMISES.map((promise) => (
                  <li
                    key={promise}
                    className="flex min-h-24 items-start gap-3 rounded-2xl border border-line bg-surface p-5 shadow-e1"
                  >
                    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-brand-gold-soft text-brand-gold-deep">
                      <Check aria-hidden className="size-4" strokeWidth={2.5} />
                    </span>
                    <span className="pt-1 text-sm leading-relaxed font-semibold text-ink">
                      {promise}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Free tools */}
        <section id="tools" className="border-y border-line bg-sunken">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-overline font-bold tracking-[0.12em] text-brand-gold-deep uppercase">
                  Start here
                </p>
                <h2 className="mt-3 font-display text-3xl leading-tight font-bold tracking-tight sm:text-4xl">
                  Useful answers, before you sign up.
                </h2>
                <p className="mt-3 max-w-2xl text-body-l text-muted">
                  Try our free tools to understand your options. Every figure shows where it comes
                  from.
                </p>
              </div>
              <Link
                href="/ai/tools"
                className="inline-flex shrink-0 items-center gap-2 text-sm font-semibold text-accent transition hover:text-accent-hover"
              >
                Browse all tools
                <ArrowUpRight aria-hidden className="size-4" />
              </Link>
            </div>
            <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {TOOLS.map((tool) => (
                <Link
                  key={tool.href}
                  href={tool.href}
                  className="group flex min-h-28 items-start gap-4 rounded-2xl border border-line bg-surface p-5 shadow-e1 transition duration-m-fast hover:-translate-y-0.5 hover:border-brand-blue-soft hover:shadow-e2"
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-blue-soft text-accent">
                    <tool.icon aria-hidden className="size-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold text-ink">{tool.label}</span>
                    <span className="mt-1 block text-sm leading-relaxed text-muted">
                      {tool.description}
                    </span>
                  </span>
                  <ArrowRight
                    aria-hidden
                    className="mt-1 size-4 shrink-0 text-subtle transition-transform group-hover:translate-x-0.5 group-hover:text-accent"
                  />
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="bg-canvas">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20">
            <div className="max-w-2xl">
              <p className="text-overline font-bold tracking-[0.12em] text-brand-gold-deep uppercase">
                Simple by design
              </p>
              <h2 className="mt-3 font-display text-3xl leading-tight font-bold tracking-tight sm:text-4xl">
                From first question to a plan you understand.
              </h2>
              <p className="mt-3 text-body-l text-muted">
                Take one step at a time. You decide what to do with the information.
              </p>
            </div>
            <ol className="mt-9 grid gap-4 sm:grid-cols-3">
              {STEPS.map((step, index) => (
                <li
                  key={step.title}
                  className="relative rounded-2xl border border-line bg-surface p-6 shadow-e1"
                >
                  <div className="flex items-center justify-between">
                    <span className="grid size-11 place-items-center rounded-xl bg-brand-blue-soft text-accent">
                      <step.icon aria-hidden className="size-5" />
                    </span>
                    <span className="font-mono text-sm font-semibold tracking-wide text-brand-gold-deep">
                      0{index + 1}
                    </span>
                  </div>
                  <p className="mt-6 font-display text-lg font-bold">{step.title}</p>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{step.line}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Pricing teaser */}
        <section className="border-y border-line bg-sunken">
          <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
            <div>
              <p className="text-overline font-bold tracking-[0.12em] text-brand-gold-deep uppercase">
                Plans that grow with you
              </p>
              <h2 className="mt-3 font-display text-3xl leading-tight font-bold tracking-tight sm:text-4xl">
                Start free. Upgrade when it helps.
              </h2>
              <p className="mt-4 max-w-md leading-relaxed text-muted">
                Explore the tools first. Choose a paid plan only when you need more support.
              </p>
              <Link
                href="/ai/pricing"
                className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-accent transition hover:text-accent-hover"
              >
                Compare plans
                <ArrowRight aria-hidden className="size-4" />
              </Link>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {PLANS.map((plan, index) => (
                <div
                  key={plan.name}
                  className={`rounded-2xl border bg-surface p-5 shadow-e1 ${
                    index === 1
                      ? "border-brand-gold-line ring-1 ring-brand-gold-line"
                      : "border-line"
                  }`}
                >
                  {index === 1 && (
                    <span className="mb-3 inline-flex rounded-full bg-brand-gold-soft px-2.5 py-1 text-[11px] font-bold text-brand-gold-deep">
                      More support
                    </span>
                  )}
                  <p className="font-display text-xl font-bold">{plan.name}</p>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{plan.line}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="relative isolate overflow-hidden bg-ink text-ink-inverse">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-36 right-[-5rem] -z-10 size-96 rounded-full bg-brand-blue/20 blur-3xl"
          />
          <div className="mx-auto flex max-w-7xl flex-col items-start gap-8 px-4 py-14 sm:px-6 sm:py-16 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-overline font-bold tracking-[0.12em] text-brand-gold uppercase">
                Your next step is free
              </p>
              <h2 className="mt-3 max-w-2xl font-display text-3xl leading-tight font-bold text-balance sm:text-4xl">
                Get a clearer picture of your options.
              </h2>
              <p className="mt-3 max-w-xl leading-relaxed text-ink-inverse/75">
                Start with an eligibility check. No card, no pressure, and no promises we can&apos;t
                keep.
              </p>
            </div>
            <ButtonLink
              href="/ai/tools/eligibility"
              variant="primary"
              size="lg"
              icon={<ArrowRight aria-hidden className="size-4" />}
              className="h-14 rounded-full px-6 text-base"
            >
              Check eligibility
            </ButtonLink>
          </div>
        </section>
      </main>
    </div>
  );
}
