import Link from "next/link";
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

      <main id="main" className="mx-auto max-w-5xl px-4 py-8 lg:py-12">
        <div className="max-w-2xl">
          <p className="text-overline uppercase text-muted">Free tool</p>
          <h1 className="mt-1 font-display text-h1 text-balance text-ink">{title}</h1>
          <p className="mt-3 text-body-l text-muted">{blurb}</p>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-start">
          <section aria-label="Your details">{form}</section>
          <section aria-label="Your result" className="lg:sticky lg:top-6">
            {result}
          </section>
        </div>

        <aside className="mt-10 rounded-r-md border border-accent-soft bg-accent-soft/40 p-6">
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
