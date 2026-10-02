"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ApiError } from "@/lib/api";
import { useCreateMyApplication, useSchools } from "@/lib/ai/my-application";
import { Button } from "../Button";
import { InlineAlert, Skeleton } from "../feedback";
import { TextField } from "../fields";
import { Select } from "../Select";

/** /ai/my-application/new: start a school's checklist, built from its actual requirements. */
export function NewApplicationView() {
  const router = useRouter();
  const schools = useSchools();
  const create = useCreateMyApplication();
  const [schoolId, setSchoolId] = useState("");
  const [programmeId, setProgrammeId] = useState("");
  const [intake, setIntake] = useState("");
  const [error, setError] = useState<string | null>(null);

  const options = schools.data?.results ?? [];
  const school = options.find((item) => item.id === schoolId);
  const programme = school?.programmes.find((item) => item.id === programmeId);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    create.mutate(
      { school: schoolId, programme: programmeId || undefined, intake },
      {
        onSuccess: (application) => router.push(`/ai/my-application/${application.id}`),
        onError: (err) =>
          setError(
            err instanceof ApiError
              ? (Object.values(err.fieldErrors)[0]?.[0] ?? err.message)
              : "We couldn't start this application. Try again.",
          ),
      },
    );
  }

  return (
    <div className="mx-auto max-w-md">
      <Link
        href="/ai/my-application"
        className="mb-4 inline-flex items-center gap-1 text-body-s font-semibold text-accent hover:underline"
      >
        <ArrowLeft aria-hidden className="size-4" /> My application
      </Link>
      <h1 className="font-display text-h1 text-ink">Add a school</h1>
      <p className="mt-2 text-body text-muted">
        We&apos;ll build your checklist from this school&apos;s actual requirements. Apply to as
        many schools as you like, each gets its own checklist.
      </p>

      {schools.isPending ? (
        <Skeleton className="mt-8 h-64 w-full" />
      ) : (
        <form onSubmit={submit} className="mt-8 space-y-5">
          {error && <InlineAlert tone="danger" title={error} />}

          <Select
            label="School"
            options={[
              { value: "", label: "Select a school…" },
              ...options.map((option) => ({
                value: option.id,
                label: option.country_name
                  ? `${option.name} — ${option.country_name}`
                  : option.name,
              })),
            ]}
            value={schoolId}
            onChange={(event) => {
              setSchoolId(event.target.value);
              setProgrammeId("");
              setIntake("");
            }}
            required
          />

          {school && school.programmes.length > 0 && (
            <Select
              label="Course"
              options={[
                { value: "", label: "Not sure yet" },
                ...school.programmes.map((option) => ({ value: option.id, label: option.name })),
              ]}
              value={programmeId}
              onChange={(event) => {
                setProgrammeId(event.target.value);
                setIntake("");
              }}
            />
          )}

          {programme && programme.intakes.length > 0 ? (
            <Select
              label="Intake"
              helper="Which start date you're aiming for."
              options={[
                { value: "", label: "Select an intake…" },
                ...programme.intakes.map((option) => ({ value: option, label: option })),
              ]}
              value={intake}
              onChange={(event) => setIntake(event.target.value)}
              required
            />
          ) : (
            <TextField
              label="Intake"
              helper="Which start date you're aiming for, e.g. October 2027."
              placeholder="October 2027"
              value={intake}
              onChange={(event) => setIntake(event.target.value)}
              required
            />
          )}

          <Button type="submit" disabled={!schoolId} loading={create.isPending} className="w-full">
            Start this application
          </Button>
        </form>
      )}
    </div>
  );
}
