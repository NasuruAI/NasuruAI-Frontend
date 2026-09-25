import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "How ranking works · Nasuru AI",
  description: "How Nasuru AI checks jobs, decides which to show, and ranks them for you.",
};

const CHECKS = [
  "The company exists and is active on its official register",
  "The employer is licensed to sponsor visas",
  "The job is posted on the employer's own site",
  "The salary meets the visa threshold",
  "No scam red flags in the posting",
];

/**
 * The ranking method, in plain words (principles A4, A6). Written from what
 * the API does (apps/jobs/checks.py and fit.py); the public, server-rendered
 * version with sources is web-build F16.
 */
export default function HowRankingWorksPage() {
  return (
    <main id="main" className="mx-auto max-w-[720px] px-4 py-10 text-ink">
      <p className="text-overline text-muted uppercase">Nasuru AI</p>
      <h1 className="mt-1 font-display text-h1">How ranking works</h1>
      <p className="mt-3 text-body-l text-muted">
        Every job is checked before you see it, and every point of its ranking is explained.
      </p>

      <h2 className="mt-8 font-display text-h2">1. Can you trust it?</h2>
      <p className="mt-2 text-body">Each job gets a trust score out of 100 from five checks:</p>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-body">
        {CHECKS.map((check) => (
          <li key={check}>{check}</li>
        ))}
      </ul>
      <ul className="mt-3 space-y-1 text-body">
        <li>
          <strong>80 or more:</strong> high trust.
        </li>
        <li>
          <strong>60 to 79:</strong> verified. Shown to everyone.
        </li>
        <li>
          <strong>40 to 59:</strong> caution. Shown only if you ask, with the warnings.
        </li>
        <li>
          <strong>Below 40:</strong> never shown.
        </li>
      </ul>
      <p className="mt-3 text-body">
        We never drop jobs quietly: the job count always says how many were left out and why. After
        three independent scam reports, a job is hidden while our team checks it.
      </p>

      <h2 className="mt-8 font-display text-h2">2. How well does it fit you?</h2>
      <p className="mt-2 text-body">
        Fit is worked out only from the details you confirmed, out of 100:
      </p>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-body">
        <li>
          <strong>Job title, 45 points:</strong> against your work history and chosen occupation.
        </li>
        <li>
          <strong>Skills, 40 points:</strong> your confirmed skills found in the posting.
        </li>
        <li>
          <strong>Salary, 15 points:</strong> whether it clears the visa threshold.
        </li>
      </ul>
      <p className="mt-3 text-body">
        One job is left out entirely: one that needs German at B2 or above when your profile
        doesn&apos;t show it. Those are counted too.
      </p>

      <h2 className="mt-8 font-display text-h2">3. What never changes the order</h2>
      <p className="mt-2 text-body">
        Some partners may pay us a commission. It never changes a job&apos;s trust score, its fit or
        its place in the list, and partner content is always labelled.
      </p>

      <p className="mt-10">
        <Link href="/ai/jobs" className="font-semibold text-accent underline underline-offset-3">
          Back to jobs
        </Link>
      </p>
    </main>
  );
}
