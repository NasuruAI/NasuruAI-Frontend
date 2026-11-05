import type { Metadata } from "next";
import { Suspense } from "react";
import { PublicProgrammesView } from "@/components/marketing/PublicProgrammesView";

export const metadata: Metadata = {
  title: "Schools and programmes abroad",
  description:
    "Compare schools and study programmes across 11 destinations. Filter by level, tuition currency, duration, language, intake and deadline.",
  alternates: { canonical: "/ai/programs" },
  openGraph: {
    title: "Schools and programmes abroad",
    description:
      "Explore programme details, tuition, intakes, deadlines and schools across 11 study destinations.",
    url: "/ai/programs",
  },
};

function CatalogueFallback() {
  return (
    <div className="mx-auto max-w-7xl px-5 py-12 text-sm text-muted sm:px-8" aria-busy="true">
      Loading school and programme catalogue…
    </div>
  );
}

export default function ProgramsPage() {
  return (
    <Suspense fallback={<CatalogueFallback />}>
      <PublicProgrammesView />
    </Suspense>
  );
}
