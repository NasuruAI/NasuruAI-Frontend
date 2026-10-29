import { ArrowRight, Ban, ClipboardCheck, FileCheck, Search, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { ButtonLink } from "@/components/ai/Button";
import { SkipLink } from "@/components/ai/SkipLink";

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
      <SkipLink />
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <Link href="/ai" className="font-display text-h4">
            Nasuru<span className="text-muted"> AI</span>
          </Link>
          <Link href="/ai/login" className="text-body-s font-semibold text-accent hover:underline">
            Sign in
          </Link>
        </div>
      </header>

      <main id="main" className="mx-auto max-w-4xl px-4 py-12 lg:py-16">
        <p className="text-overline uppercase text-muted">How it works</p>
        <h1 className="mt-2 font-display text-display-xl text-balance leading-[1.05]">
          Your route abroad, checked properly.
        </h1>
        <p className="mt-4 max-w-xl text-body-l text-muted">
          Four steps from &ldquo;where do I even start?&rdquo; to a plan you can act on — with the
          honest answer at every turn.
        </p>

        <ol className="mt-10 space-y-5">
          {STEPS.map((step, index) => (
            <li
              key={step.title}
              className="flex gap-4 rounded-r-md border border-line bg-surface p-5"
            >
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent-soft">
                <step.icon aria-hidden className="size-5 text-accent" />
              </div>
              <div>
                <p className="font-display text-h4">
                  {index + 1}. {step.title}
                </p>
                <p className="mt-1 text-body text-muted">{step.line}</p>
              </div>
            </li>
          ))}
        </ol>

        <section className="mt-12 rounded-r-md border border-line bg-surface p-6">
          <h2 className="font-display text-h3">What sets us apart</h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {PROMISES.map((promise) => (
              <li key={promise} className="flex items-start gap-2 text-body font-semibold">
                <Ban aria-hidden className="mt-0.5 size-5 shrink-0 text-danger" />
                {promise}
              </li>
            ))}
          </ul>
          <Link
            href="/ai/how-ranking-works"
            className="mt-5 inline-flex items-center gap-1 text-body-s font-semibold text-accent hover:underline"
          >
            See exactly how we rank and check jobs
            <ArrowRight aria-hidden className="size-4" />
          </Link>
        </section>

        <div className="mt-10 flex flex-wrap gap-3">
          <ButtonLink href="/ai/tools/eligibility" size="lg">
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
