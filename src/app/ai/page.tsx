import { Ban, ArrowRight, Check, FileCheck, Search, Sparkles } from "lucide-react";
import Link from "next/link";
import { ButtonLink } from "@/components/ai/Button";

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
  { href: "/ai/tools/eligibility", label: "Am I eligible?" },
  { href: "/ai/tools/crs", label: "Canada CRS score" },
  { href: "/ai/tools/opportunity-card", label: "Germany Opportunity Card" },
  { href: "/ai/tools/uk-points", label: "UK Skilled Worker points" },
  { href: "/ai/tools/grade-converter", label: "Grade converter" },
];

const STEPS = [
  { icon: Search, title: "Tell us about you", line: "A few questions. No documents to start." },
  {
    icon: Sparkles,
    title: "See your real routes",
    line: "Only what you qualify for — the honest answer first.",
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
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <span className="font-display text-h4">
            Nasuru<span className="text-muted"> AI</span>
          </span>
          <div className="flex items-center gap-4">
            <Link
              href="/ai/login"
              className="text-body-s font-semibold text-accent hover:underline"
            >
              Sign in
            </Link>
            <ButtonLink href="/ai/signup" size="sm">
              Get started free
            </ButtonLink>
          </div>
        </div>
      </header>

      <main id="main">
        {/* Hero */}
        <section className="mx-auto max-w-5xl px-4 pt-14 pb-10 lg:pt-20">
          <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div>
              <p className="text-overline uppercase text-muted">Japa — done honestly</p>
              <h1 className="mt-2 font-display text-display-xl text-balance leading-[1.05]">
                Know your real route abroad.
              </h1>
              <p className="mt-4 max-w-xl text-body-l text-muted">
                The visas you actually qualify for. Employers who can truly sponsor you. Every
                answer prepared — and you press submit.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <ButtonLink href="/ai/tools/eligibility" size="lg">
                  Check if I qualify — free
                </ButtonLink>
                <ButtonLink href="/ai/tools" size="lg" variant="secondary">
                  See the free tools
                </ButtonLink>
              </div>
              <p className="mt-3 text-body-s text-subtle">No account needed to start. No card.</p>
            </div>

            {/* Illustrative result card — conveys the product at a glance */}
            <div className="rounded-r-lg border border-line bg-surface p-5 shadow-e1">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-caption uppercase text-subtle">Example result</p>
                  <p className="mt-1 font-display text-h3">EU Blue Card</p>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-success-bg px-2.5 py-1 text-caption font-semibold text-success">
                  <Check aria-hidden className="size-3.5" /> You qualify
                </span>
              </div>
              <p className="mt-2 text-body-s text-muted tabular-nums">
                Germany · about 5 months · leads to permanent residence
              </p>
              <div className="mt-4 h-px bg-line" />
              <p className="mt-3 text-caption text-subtle">
                Checked against the rules — source shown on every figure.
              </p>
            </div>
          </div>
        </section>

        {/* What we won't do — the trust block */}
        <section className="border-y border-line bg-surface">
          <div className="mx-auto max-w-5xl px-4 py-12">
            <h2 className="font-display text-h2">What we won&apos;t do</h2>
            <p className="mt-1 text-body text-muted">
              This is how you tell us apart from the agents.
            </p>
            <ul className="mt-6 grid gap-3 sm:grid-cols-2">
              {PROMISES.map((promise) => (
                <li
                  key={promise}
                  className="flex items-start gap-3 rounded-r-md border border-line p-4"
                >
                  <Ban aria-hidden className="mt-0.5 size-5 shrink-0 text-danger" />
                  <span className="text-body font-semibold">{promise}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Free tools */}
        <section className="mx-auto max-w-5xl px-4 py-12">
          <h2 className="font-display text-h2">Free tools, no sign-up</h2>
          <p className="mt-1 text-body text-muted">Every figure shows where it comes from.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            {TOOLS.map((tool) => (
              <Link
                key={tool.href}
                href={tool.href}
                className="group inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-4 py-2 text-body-s font-semibold transition-colors hover:border-line-strong"
              >
                {tool.label}
                <ArrowRight
                  aria-hidden
                  className="size-4 text-muted transition-transform group-hover:translate-x-0.5"
                />
              </Link>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className="border-t border-line bg-surface">
          <div className="mx-auto max-w-5xl px-4 py-12">
            <h2 className="font-display text-h2">How it works</h2>
            <ol className="mt-6 grid gap-5 sm:grid-cols-3">
              {STEPS.map((step, index) => (
                <li key={step.title}>
                  <step.icon aria-hidden className="size-6 text-accent" />
                  <p className="mt-3 font-semibold">
                    {index + 1}. {step.title}
                  </p>
                  <p className="mt-1 text-body-s text-muted">{step.line}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Pricing teaser */}
        <section className="mx-auto max-w-5xl px-4 py-12">
          <h2 className="font-display text-h2">Start free. Upgrade when it helps.</h2>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {PLANS.map((plan) => (
              <div key={plan.name} className="rounded-r-md border border-line bg-surface p-5">
                <p className="font-display text-h4">{plan.name}</p>
                <p className="mt-1 text-body-s text-muted">{plan.line}</p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-body-s text-subtle">
            We never charge for a job, an introduction, or an offer.
          </p>
          <Link
            href="/ai/pricing"
            className="mt-4 inline-flex items-center gap-1 text-body-s font-semibold text-accent hover:underline"
          >
            See full pricing
            <ArrowRight aria-hidden className="size-4" />
          </Link>
        </section>

        {/* Final CTA */}
        <section className="bg-ink text-ink-inverse">
          <div className="mx-auto max-w-5xl px-4 py-14 text-center">
            <h2 className="font-display text-h1 text-balance">
              Your route abroad, checked properly.
            </h2>
            <p className="mx-auto mt-3 max-w-md text-body-l opacity-80">
              Free to start. No card. You stay in control the whole way.
            </p>
            <ButtonLink href="/ai/signup" size="lg" className="mt-7">
              Get started free
            </ButtonLink>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-body-s text-muted">
          <nav className="flex flex-wrap gap-4">
            <Link href="/ai/tools" className="hover:text-ink hover:underline">
              Free tools
            </Link>
            <Link href="/ai/how-ranking-works" className="hover:text-ink hover:underline">
              How ranking works
            </Link>
            <Link href="/ai/login" className="hover:text-ink hover:underline">
              Sign in
            </Link>
          </nav>
          <p className="text-subtle">Nasuru AI — your move abroad, checked.</p>
        </div>
      </footer>
    </div>
  );
}
