import { ButtonLink } from "../Button";

/**
 * The one layout every free tool shares (web.md §3.3): a question panel on the
 * left, a live result panel on the right (sticky at lg, below the inputs on
 * sm), and a closing card that turns an answer into a sign-up. Public, no rail.
 */
export function ToolShell({
  title,
  blurb,
  form,
  result,
}: {
  title: string;
  blurb: string;
  form: React.ReactNode;
  result: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-canvas">
      <main id="main" className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:py-14">
        <div className="rounded-r-lg border border-line bg-gradient-to-br from-brand-blue-soft via-surface to-brand-gold-soft p-6 sm:p-9">
          <p className="text-overline font-bold tracking-[0.12em] text-brand-gold-deep uppercase">
            Free tool · no sign-up
          </p>
          <h1 className="mt-3 max-w-3xl font-display text-display-l text-balance leading-tight text-ink">
            {title}
          </h1>
          <p className="mt-3 max-w-2xl text-body-l leading-relaxed text-muted">{blurb}</p>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_26rem] lg:items-start">
          <section
            aria-label="Your details"
            className="rounded-r-lg border border-line bg-surface p-5 shadow-e1 sm:p-7"
          >
            {form}
          </section>
          <section
            aria-label="Your result"
            className="rounded-r-lg border border-line bg-surface p-5 shadow-e1 lg:sticky lg:top-24 sm:p-7"
          >
            {result}
          </section>
        </div>

        <aside className="mt-10 rounded-r-lg border border-brand-gold-line bg-brand-gold-soft/60 p-6 sm:p-8">
          <h2 className="font-display text-h3 text-ink">Save this and get your full plan — free</h2>
          <p className="mt-2 max-w-xl text-body text-muted">
            Sign up and we&apos;ll keep your answers, check every route you qualify for, and show
            only employers who can actually sponsor you. No card needed.
          </p>
          <ButtonLink href="/ai/signup" className="mt-4">
            Check my full eligibility — free
          </ButtonLink>
        </aside>
      </main>
    </div>
  );
}
