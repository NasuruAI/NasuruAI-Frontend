import { notFound } from "next/navigation";
import { OnboardingStep } from "@/components/ai/onboarding/OnboardingStep";
import { isStep, STEPS } from "@/lib/ai/onboarding-steps";

export function generateStaticParams() {
  return STEPS.map((step) => ({ step: step.slug }));
}

export default async function StepPage({ params }: PageProps<"/ai/start/[step]">) {
  const { step } = await params;
  if (!isStep(step)) notFound();
  return <OnboardingStep step={step} />;
}
