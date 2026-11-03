/**
 * The frame every sign-in and sign-up page shares: the mark, one card, and
 * the links under it. No app chrome: a signed-out visitor has no plan yet.
 */
import { BrandLockup } from "@/components/ui/Brand";
import { ArrowUpRight, Check, ShieldCheck } from "lucide-react";
import Link from "next/link";

export function AuthFrame({
  title,
  lead,
  children,
  footer,
}: {
  title: string;
  lead?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <main id="main" className="relative isolate min-h-screen overflow-hidden bg-canvas">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 right-[-10rem] -z-10 size-[34rem] rounded-full bg-brand-blue-soft/60 blur-3xl"
      />
      <div className="mx-auto grid min-h-screen max-w-7xl items-center gap-12 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_0.85fr] lg:gap-20 lg:py-16">
        <section className="mx-auto w-full max-w-md lg:mx-0">
          <Link href="/ai" aria-label="Nasuru AI home" className="mb-8 inline-flex">
            <BrandLockup name="Nasuru AI" />
          </Link>
          <div className="rounded-r-lg border border-line bg-surface p-5 shadow-e3 sm:p-8">
            <h1 className="font-display text-h2 text-balance text-ink">{title}</h1>
            {lead && <p className="mt-2 text-body leading-relaxed text-muted">{lead}</p>}
            <div className="mt-6">{children}</div>
          </div>
          {footer && (
            <div className="mt-6 space-y-2 text-center text-body-s text-muted">{footer}</div>
          )}
        </section>

        <aside className="hidden max-w-xl lg:block">
          <p className="inline-flex items-center gap-2 rounded-full border border-brand-gold-line bg-brand-gold-soft px-3 py-1.5 text-xs font-bold tracking-[0.1em] text-brand-gold-deep uppercase">
            <ShieldCheck aria-hidden className="size-4" />A more transparent way forward
          </p>
          <h2 className="mt-6 font-display text-4xl leading-tight font-bold tracking-tight text-balance text-ink">
            Your next step, with the facts in view.
          </h2>
          <p className="mt-4 max-w-lg text-lg leading-relaxed text-muted">
            Understand your options, see where the rules come from, and stay in control of every
            decision.
          </p>
          <ul className="mt-8 space-y-4">
            {[
              "No one can guarantee your visa.",
              "We never charge for a job or introduction.",
              "You review everything and submit it yourself.",
            ].map((promise) => (
              <li key={promise} className="flex items-center gap-3 text-sm font-semibold text-ink">
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-brand-gold-soft text-brand-gold-deep">
                  <Check aria-hidden className="size-4" strokeWidth={2.5} />
                </span>
                {promise}
              </li>
            ))}
          </ul>
          <Link
            href="/ai/trust"
            className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-accent transition hover:text-accent-hover"
          >
            See how we check our sources
            <ArrowUpRight aria-hidden className="size-4" />
          </Link>
        </aside>
      </div>
    </main>
  );
}
