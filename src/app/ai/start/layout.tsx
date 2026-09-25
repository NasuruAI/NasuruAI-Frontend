import type { Metadata } from "next";
import { OnboardingFrame } from "@/components/ai/onboarding/OnboardingFrame";

export const metadata: Metadata = { title: "Get started · Nasuru AI", robots: { index: false } };

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return <OnboardingFrame>{children}</OnboardingFrame>;
}
