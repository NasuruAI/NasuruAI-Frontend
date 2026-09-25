/**
 * The seven onboarding steps (web.md §4) and where a candidate resumes. Pure,
 * and free of "use client", so server components (the step route's static
 * params) can use it as well as the steps themselves.
 */

import type { components } from "./schema";

type Me = components["schemas"]["Me"];

export const STEPS = [
  { slug: "welcome", title: "Welcome", minutes: 1 },
  { slug: "upload", title: "Your documents", minutes: 2 },
  { slug: "questions", title: "Quick questions", minutes: 3 },
  { slug: "facts", title: "Confirm your facts", minutes: 4 },
  { slug: "occupation", title: "Your occupation", minutes: 1 },
  { slug: "destination", title: "Choose your destination", minutes: 2 },
  { slug: "results", title: "Your results", minutes: 1 },
] as const;

export type StepSlug = (typeof STEPS)[number]["slug"];

export function stepIndex(slug: string): number {
  return STEPS.findIndex((step) => step.slug === slug);
}

export function isStep(slug: string): slug is StepSlug {
  return stepIndex(slug) >= 0;
}

/** "about 6 minutes left", counting this step and the ones after it. */
export function minutesLeft(slug: StepSlug): number {
  return STEPS.slice(stepIndex(slug)).reduce((sum, step) => sum + step.minutes, 0);
}

export function stepHref(slug: StepSlug): string {
  return `/ai/start/${slug}`;
}

export function nextStep(slug: StepSlug): StepSlug | null {
  return STEPS[stepIndex(slug) + 1]?.slug ?? null;
}

export function previousStep(slug: StepSlug): StepSlug | null {
  const index = stepIndex(slug);
  return index > 0 ? STEPS[index - 1].slug : null;
}

/**
 * The first step with something still to do. A candidate who left after the
 * questions comes back to the facts, not to the welcome.
 */
export function resumeStep(me: Me, hasOccupation: boolean): StepSlug | "done" {
  if (me.onboarding_completed_at) return "done";
  const counts = me.counts as { documents?: number; facts_unconfirmed?: number };
  if (!counts.documents) return me.questionnaire_complete ? "upload" : "welcome";
  if (!me.questionnaire_complete) return "questions";
  if (counts.facts_unconfirmed) return "facts";
  if (!hasOccupation) return "occupation";
  if (!me.destination) return "destination";
  return "results";
}
