"use client";

import type { StepSlug } from "@/lib/ai/onboarding";
import { DestinationStep } from "./DestinationStep";
import { FactsStep } from "./FactsStep";
import { OccupationStep } from "./OccupationStep";
import { QuestionsStep } from "./QuestionsStep";
import { ResultsStep } from "./ResultsStep";
import { UploadStep } from "./UploadStep";
import { WelcomeStep } from "./WelcomeStep";

const STEP_VIEWS: Record<StepSlug, () => React.ReactNode> = {
  welcome: WelcomeStep,
  upload: UploadStep,
  questions: QuestionsStep,
  facts: FactsStep,
  occupation: OccupationStep,
  destination: DestinationStep,
  results: ResultsStep,
};

export function OnboardingStep({ step }: { step: StepSlug }) {
  const View = STEP_VIEWS[step];
  return <View />;
}
