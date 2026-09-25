"use client";

import { Lock, ShieldCheck, Send } from "lucide-react";
import { useMe } from "@/lib/ai/shell";
import { stepHref } from "@/lib/ai/onboarding";
import { ButtonLink } from "../Button";
import { StepActions, StepIntro } from "./OnboardingFrame";

const PROMISES = [
  {
    Icon: Send,
    title: "We won't submit anything for you",
    body: "We prepare forms, answers and documents. You check them and send them yourself.",
  },
  {
    Icon: ShieldCheck,
    title: "We won't promise you a visa",
    body: "Every result shows the official rule it comes from, so you can check it. Nobody can guarantee a visa, and anyone who does is lying.",
  },
  {
    Icon: Lock,
    title: "We won't share your documents without asking",
    body: "Your files are encrypted. You see every time one is opened, and you can delete everything.",
  },
];

export function WelcomeStep() {
  const me = useMe();
  const name = me.data?.first_name;
  return (
    <>
      <StepIntro
        title={name ? `Welcome, ${name}` : "Welcome to Nasuru AI"}
        lead="In about 15 minutes you'll see every route open to you, what each costs in naira, and a plan to get there."
      />
      <ul className="space-y-4">
        {PROMISES.map(({ Icon, title, body }) => (
          <li key={title} className="flex gap-4 rounded-r-md border border-line bg-surface p-4">
            <Icon aria-hidden className="mt-0.5 size-6 shrink-0 text-accent" />
            <div>
              <p className="font-semibold text-ink">{title}</p>
              <p className="mt-1 text-body text-muted">{body}</p>
            </div>
          </li>
        ))}
      </ul>
      <StepActions>
        <ButtonLink href={stepHref("upload")} variant="primary" size="lg">
          Start
        </ButtonLink>
      </StepActions>
    </>
  );
}
