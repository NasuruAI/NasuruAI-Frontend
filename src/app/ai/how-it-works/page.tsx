import { ArrowRight, Check, ClipboardCheck, FileCheck, Search, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { ButtonLink } from "@/components/ai/Button";

export const metadata = {
  title: "How it works · Nasuru AI",
  description:
    "Four steps: tell us about you, see the routes and jobs you actually qualify for, get every answer prepared, and you press submit. We never guarantee a visa or charge for a job.",
};

const STEPS = [
  {
    icon: Search,
    title: "Tell us about you",
    line: "A few questions — your schooling, work and goals. No documents to start.",
  },
  {
    icon: ClipboardCheck,
    title: "See your real routes and jobs",
    line: "Only the visas you qualify for and employers who can actually sponsor you, each checked against the live rules.",
  },
  {
    icon: FileCheck,
    title: "Get every answer prepared",
    line: "Forms, letters and a tailored CV, drafted from your own facts. You review and submit — we never do.",
  },
  {
    icon: ShieldCheck,
    title: "We check. You decide.",
    line: "Every figure shows its source, and you stay in control of your accounts and your money the whole way.",
  },
];

const PROMISES = [
  "Never guarantee a visa",
  "Never charge for a job or introduction",
  "Never log into your accounts",
  "Never press submit for you",
];

export default function HowItWorksPage() {
  return (
    <div className="bg-canvas text-ink">
      <main id="main" className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:py-16">
        <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-end">
          <div>
            <p className="text-overline font-bold tracking-[0.12em] text-brand-gold-deep uppercase">
              How it works
            </p>
            <h1 className="mt-3 font-display text-display-xl text-balance leading-[1.05]">
              A clearer route, one step at a time.
            </h1>
          </div>
          <p className="max-w-2xl pb-1 text-body-l leading-relaxed text-muted lg:ml-auto">
            From &ldquo;where do I even start?&rdquo; to a plan you can act on—with the honest
            answer at every turn.
          </p>
        </div>

        <ol className="mt-10 grid gap-4 sm:grid-cols-2">
          {STEPS.map((step, index) => (
            <li
              key={step.title}
              className="rounded-r-lg border border-line bg-surface p-6 shadow-e1 sm:p-7"
            >
              <div className="flex items-center justify-between">
                <span className="grid size-12 place-items-center rounded-2xl bg-brand-blue-soft text-accent">
                  <step.icon aria-hidden className="size-5" />
                </span>
                <span className="font-mono text-sm font-semibold text-brand-gold-deep">
                  0{index + 1}
                </span>
              </div>
              <h2 className="mt-6 font-display text-h3 text-ink">{step.title}</h2>
              <p className="mt-2 max-w-lg text-body leading-relaxed text-muted">{step.line}</p>
            </li>
          ))}
        </ol>

        <section className="mt-10 grid gap-8 rounded-r-lg bg-brand-blue-deep p-6 text-ink-inverse shadow-e2 sm:p-9 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
          <div>
            <p className="text-overline font-bold tracking-[0.12em] text-brand-gold-on-ink uppercase">
              Your future stays yours
            </p>
            <h2 className="mt-3 font-display text-2xl font-bold text-balance sm:text-3xl">
              Clear boundaries. No false promises.
            </h2>
            <Link
              href="/ai/how-ranking-works"
              className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-ink-inverse underline decoration-brand-gold underline-offset-4 transition hover:text-brand-gold-on-ink"
            >
              See how we check and rank jobs
              <ArrowRight aria-hidden className="size-4" />
            </Link>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2">
            {PROMISES.map((promise) => (
              <li
                key={promise}
                className="flex items-center gap-3 rounded-xl border border-ink-inverse/15 bg-ink-inverse/5 p-4 text-sm font-semibold"
              >
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-brand-gold text-brand-blue-deep">
                  <Check aria-hidden className="size-4" strokeWidth={2.5} />
                </span>
                {promise}
              </li>
            ))}
          </ul>
        </section>

        <div className="mt-10 flex flex-wrap gap-3">
          <ButtonLink href="/ai/tools/eligibility" size="lg" variant="primary">
            Check if I qualify — free
          </ButtonLink>
          <ButtonLink href="/ai/pricing" size="lg" variant="secondary">
            See pricing
          </ButtonLink>
        </div>
      </main>
    </div>
  );
}
