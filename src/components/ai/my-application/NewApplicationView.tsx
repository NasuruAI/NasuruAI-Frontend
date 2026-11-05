"use client";

import { ArrowLeft, GraduationCap, Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ApiError } from "@/lib/api";
import { useCreateMyApplication, useSchools } from "@/lib/ai/my-application";
import { ApplyBoardProgrammeCard } from "../evidence";
import { Button } from "../Button";
import { EmptyState, Skeleton } from "../feedback";
import { TextField } from "../fields";
import { useToast } from "../Toast";

const COUNTRY_CODES: Record<string, string> = {
  Australia: "AUS",
  Canada: "CAN",
  Germany: "DEU",
  Ireland: "IRL",
  Malaysia: "MYS",
  Malta: "MLT",
  Singapore: "SGP",
  Spain: "ESP",
  "United Arab Emirates": "ARE",
  "United Kingdom": "GBR",
  "United States": "USA",
};

/** /ai/my-application/new: browse schools and start an application from a programme card. */
export function NewApplicationView() {
  const router = useRouter();
  const [searchDraft, setSearchDraft] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const schools = useSchools(search, page);
  const create = useCreateMyApplication();
  const toast = useToast();

  useEffect(() => {
    if (schools.isError) toast({ message: "We couldn't load schools." });
  }, [schools.isError, toast]);

  function submitSearch(event: React.FormEvent) {
    event.preventDefault();
    setPage(1);
    setSearch(searchDraft.trim());
  }

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

  const schoolsInPage = schools.data?.results ?? [];
  const programmeCards = schoolsInPage.flatMap((school) =>
    school.programmes.map((programme) => ({ school, programme })),
  );
  const totalPages = schools.data ? Math.max(1, Math.ceil(schools.data.count / 25)) : 1;

  return (
    <div className="mx-auto max-w-6xl">
      <Link
        href="/ai/my-application"
        className="mb-4 inline-flex items-center gap-1 text-body-s font-semibold text-accent hover:underline"
      >
        <ArrowLeft aria-hidden className="size-4" /> My application
      </Link>
      <h1 className="font-display text-h1 text-ink">Choose a programme</h1>
      <p className="mt-2 text-body text-muted">
        Compare school programmes, fees, locations, and available intakes. We&apos;ll build your
        checklist when you create an application.
      </p>

      <form onSubmit={submitSearch} role="search" className="mt-6 flex flex-wrap items-end gap-3">
        <TextField
          label="Search schools and programmes"
          placeholder="Search by school, city, or programme"
          value={searchDraft}
          onChange={(event) => setSearchDraft(event.target.value)}
          className="min-w-60 flex-1"
        />
        <Button type="submit" variant="secondary" icon={<Search aria-hidden className="size-4" />}>
          Search
        </Button>
      </form>

      {schools.isPending ? (
        <div
          className="mt-6 grid gap-4 md:grid-cols-2"
          aria-busy="true"
          aria-label="Loading schools"
        >
          <Skeleton className="h-[30rem] w-full" />
          <Skeleton className="h-[30rem] w-full" />
        </div>
      ) : schools.isError ? (
        <div className="mt-6">
          <Button size="sm" variant="secondary" onClick={() => void schools.refetch()}>
            Try again
          </Button>
        </div>
      ) : programmeCards.length === 0 ? (
        <div className="mt-6">
          <EmptyState icon={<GraduationCap />} title="No programmes found">
            Try another school or programme name.
          </EmptyState>
        </div>
      ) : (
        <>
          <p role="status" className="mt-6 mb-3 text-body-s text-muted">
            {schools.data?.count.toLocaleString("en-GB")} schools · {programmeCards.length}{" "}
            programmes on this page
          </p>
          <ol className="grid items-stretch gap-4 md:grid-cols-2" aria-label="School programmes">
            {programmeCards.map(({ school, programme }) => {
              const details = programme.attributes.applyboard;
              const country = school.country_name ?? "";
              const countryCode = COUNTRY_CODES[country] ?? country;
              const rawIntakes =
                details?.program_intakes
                  ?.map((intake) => intake.startDate)
                  .filter((value): value is string => Boolean(value)) ?? programme.intakes;
              const intakes = [...new Set(rawIntakes)];

              return (
                <li key={programme.id}>
                  <ApplyBoardProgrammeCard
                    schoolName={school.name}
                    schoolLogo={school.attributes.applyboard?.logo_url}
                    country={countryCode}
                    province={school.attributes.applyboard?.province}
                    city={school.city}
                    name={programme.name}
                    level={details?.program_level_label ?? programme.level}
                    tuition={
                      programme.tuition_amount === null ? null : Number(programme.tuition_amount)
                    }
                    currency={programme.tuition_currency}
                    applicationFee={details?.application_fee}
                    minLength={details?.min_length ?? programme.duration_months}
                    maxLength={details?.max_length ?? programme.duration_months}
                    successChance={details?.success_score?.label}
                    tags={details?.tags}
                    intakes={intakes}
                    instantSubmission={details?.application_enabled}
                    creating={create.isPending}
                    onCreate={(intake) => createApplication(school.id, programme.id, intake)}
                  />
                </li>
              );
            })}
          </ol>
          {totalPages > 1 && (
            <nav aria-label="School pages" className="mt-6 flex items-center justify-between gap-3">
              <Button
                variant="secondary"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((current) => current - 1)}
              >
                Previous
              </Button>
              <span className="text-body-s text-muted tabular-nums">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="secondary"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((current) => current + 1)}
              >
                Next
              </Button>
            </nav>
          )}
        </>
      )}
    </div>
  );
}
