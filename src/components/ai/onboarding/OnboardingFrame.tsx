"use client";

/**
 * The onboarding layout (web.md §4): no rail, a slim top bar with the logo,
 * the step and time left, and "Save and exit". Content is 640 px, centred;
 * the facts step widens for its source panel.
 */

import Link from "next/link";
import { usePathname, useRouter, useSelectedLayoutSegment } from "next/navigation";
import { useEffect } from "react";
import { useSession } from "@/lib/auth/SessionProvider";
import { isStep, minutesLeft, STEPS, stepIndex } from "@/lib/ai/onboarding";
import { cx } from "../cx";
import { Skeleton } from "../feedback";

export function OnboardingFrame({ children }: { children: React.ReactNode }) {
  const { session, loading } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const segment = useSelectedLayoutSegment();
  const step = segment && isStep(segment) ? segment : null;

  useEffect(() => {
    if (!loading && !session) router.replace(`/ai/login?next=${encodeURIComponent(pathname)}`);
  }, [loading, session, router, pathname]);

  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-r-sm focus:bg-surface focus:px-3 focus:py-2"
      >
        Skip to content
      </a>
      <header className="sticky top-0 z-30 border-b border-line bg-surface">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-3 px-4">
          <span className="flex items-center gap-2">
            <span
              aria-hidden
              className="flex size-7 items-center justify-center rounded-r-sm bg-accent font-display text-body-s font-bold text-on-accent"
            >
              N
            </span>
            <span className="hidden font-display text-h4 font-semibold sm:inline">Nasuru AI</span>
          </span>
          {step && (
            <p className="min-w-0 flex-1 truncate text-center text-body-s text-muted">
              <span className="font-semibold text-ink">
                Step {stepIndex(step) + 1} of {STEPS.length}
              </span>
              <span className="hidden sm:inline">
                {" "}
                · about {minutesLeft(step)} minute{minutesLeft(step) === 1 ? "" : "s"} left
              </span>
            </p>
          )}
          <Link
            href="/ai/plan"
            className="ml-auto rounded-r-sm px-2 py-2 text-body-s font-semibold text-accent hover:bg-accent-soft"
          >
            Save and exit
          </Link>
        </div>
        {step && (
          <div
            role="progressbar"
            aria-label="Onboarding progress"
            aria-valuemin={1}
            aria-valuemax={STEPS.length}
            aria-valuenow={stepIndex(step) + 1}
            aria-valuetext={`Step ${stepIndex(step) + 1} of ${STEPS.length}: ${STEPS[stepIndex(step)].title}`}
            className="h-1 bg-sunken"
          >
            <div
              className="h-full bg-accent transition-[width] duration-m-base ease-m"
              style={{ width: `${((stepIndex(step) + 1) / STEPS.length) * 100}%` }}
            />
          </div>
        )}
      </header>
      <main
        id="main"
        className={cx(
          "mx-auto w-full flex-1 px-4 pt-8 pb-16",
          step === "facts" ? "max-w-5xl" : "max-w-[640px]",
        )}
      >
        {loading || !session ? (
          <div aria-busy="true" aria-label="Loading" className="space-y-3">
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : (
          children
        )}
      </main>
    </div>
  );
}

/** Heading and lead for a step: the h1 each step page starts with. */
export function StepIntro({ title, lead }: { title: React.ReactNode; lead?: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h1 className="font-display text-h1 text-balance text-ink">{title}</h1>
      {lead && <p className="mt-2 text-body-l text-muted">{lead}</p>}
    </div>
  );
}

/** Back and Continue at the foot of a step. */
export function StepActions({
  back,
  children,
}: {
  back?: string | null;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-8 flex flex-wrap-reverse items-center justify-between gap-3 border-t border-line pt-6">
      {back ? (
        <Link
          href={back}
          className="rounded-r-sm px-2 py-2 text-body font-semibold text-accent hover:bg-accent-soft"
        >
          Back
        </Link>
      ) : (
        <span />
      )}
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </div>
  );
}
