"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ApiError } from "@/lib/api";
import { useCreateMyApplication } from "@/lib/ai/my-application";
import { type PublicProgramme } from "@/lib/public-programmes";
import { ProgrammeCatalogue } from "@/components/marketing/ProgrammeCatalogue";
import { ApplyBoardProgrammeCard } from "../evidence";
import { useToast } from "../Toast";

function intakesFor(programme: PublicProgramme): string[] {
  const fromApplyboard = (programme.applyboard.program_intakes ?? [])
    .map((intake) => intake.startDate)
    .filter((value): value is string => Boolean(value));
  return [...new Set(fromApplyboard.length ? fromApplyboard : programme.intakes)];
}

function successChanceOf(programme: PublicProgramme): string | undefined {
  const score = programme.applyboard.success_score;
  if (typeof score === "string") return score;
  return score?.label ?? undefined;
}

/** /ai/my-application/new: browse the full programme catalogue (same search and
 * pagination as /ai/programs) and start an application from a programme card. */
export function NewApplicationView() {
  const router = useRouter();
  const create = useCreateMyApplication();
  const toast = useToast();

  function createApplication(schoolId: string, programmeId: string, intake: string) {
    create.mutate(
      { school: schoolId, programme: programmeId || undefined, intake },
      {
        onSuccess: (application) => router.push(`/ai/my-application/${application.id}`),
        onError: (err) =>
          toast({
            message:
              err instanceof ApiError
                ? (Object.values(err.fieldErrors)[0]?.[0] ?? err.message)
                : "We couldn't start this application. Try again.",
          }),
      },
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-10">
      <Link
        href="/ai/my-application"
        className="mb-4 inline-flex items-center gap-1 text-body-s font-semibold text-accent hover:underline"
      >
        <ArrowLeft aria-hidden className="size-4" /> My application
      </Link>
      <h1 className="font-display text-h1 text-ink">Choose a programme</h1>
      <p className="mt-2 mb-6 text-body text-muted">
        Compare school programmes, fees, locations, and available intakes. We&apos;ll build your
        checklist when you create an application.
      </p>

      <ProgrammeCatalogue
        basePath="/ai/my-application/new"
        resultsTitle="Programmes"
        renderCard={(programme) => {
          const { school, applyboard } = programme;
          return (
            <ApplyBoardProgrammeCard
              schoolName={school.name}
              schoolLogo={school.logo_url || undefined}
              country={school.country_code ?? school.country_name ?? ""}
              province={school.province || undefined}
              city={school.city || undefined}
              name={programme.name}
              level={applyboard.program_level_label ?? programme.level}
              tuition={programme.tuition_amount === null ? null : Number(programme.tuition_amount)}
              currency={programme.tuition_currency}
              applicationFee={
                applyboard.application_fee === null || applyboard.application_fee === undefined
                  ? null
                  : Number(applyboard.application_fee)
              }
              minLength={applyboard.min_length ?? programme.duration_months}
              maxLength={applyboard.max_length ?? programme.duration_months}
              successChance={successChanceOf(programme)}
              tags={applyboard.tags}
              intakes={intakesFor(programme)}
              instantSubmission={applyboard.application_enabled ?? undefined}
              creating={create.isPending}
              onCreate={(intake) => createApplication(school.id, programme.id, intake)}
            />
          );
        }}
      />
    </div>
  );
}
