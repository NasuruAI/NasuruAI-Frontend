"use client";

/**
 * Profile facts as people read them, and one editor for every kind
 * (apps/candidates/schemas.py). Editing keeps fields the form doesn't show,
 * such as a role's duties and skills read from the CV.
 */

import { useState } from "react";
import { ApiError } from "@/lib/api";
import { countries } from "@/lib/ai/countries";
import { type FactKind, type ProfileFact, useAddFact, useFactAction } from "@/lib/ai/onboarding";
import { Button } from "../Button";
import { Checkbox } from "../choice";
import { Dialog } from "../Dialog";
import { InlineAlert } from "../feedback";
import { TextField } from "../fields";
import { Select } from "../Select";

type Data = Record<string, unknown>;

export const KIND_LABEL: Record<FactKind, string> = {
  work: "Work",
  education: "Education",
  certification: "Certification",
  test_score: "Test score",
  language: "Language",
  skill: "Skill",
};

const LEVELS: Record<string, string> = {
  secondary: "Secondary school",
  vocational: "Vocational",
  diploma: "Diploma (OND, HND)",
  bachelor: "Bachelor's degree",
  master: "Master's degree",
  doctorate: "Doctorate",
  other: "Other",
};

const LANGUAGE_LEVELS: Record<string, string> = {
  native: "Native",
  C2: "C2",
  C1: "C1",
  B2: "B2",
  B1: "B1",
  A2: "A2",
  A1: "A1",
};

const TESTS = [
  "IELTS",
  "IELTS_UKVI",
  "TOEFL",
  "PTE",
  "DUOLINGO",
  "CELPIP",
  "TEF",
  "TCF",
  "GOETHE",
  "TELC",
  "TESTDAF",
  "OTHER",
];

/** "Mar 2022" from "2022-03"; "2022" stays as it is. */
export function partialDate(value: unknown): string | null {
  if (typeof value !== "string" || !value) return null;
  const [year, month] = value.split("-");
  if (!month) return year;
  return new Date(Number(year), Number(month) - 1, 1).toLocaleDateString("en-GB", {
    month: "short",
    year: "numeric",
  });
}

function span(data: Data, endKey = "end"): string | undefined {
  const start = partialDate(data.start);
  const end = data.current ? "now" : partialDate(data[endKey]);
  if (!start && !end) return undefined;
  return [start ?? "?", end ?? "?"].join(" – ");
}

const str = (value: unknown) => (typeof value === "string" && value ? value : undefined);

/** Title, subtitle and detail lines for a fact card. */
export function factView(fact: Pick<ProfileFact, "kind" | "data">): {
  title: string;
  subtitle?: string;
  detail?: string;
} {
  const data = (fact.data ?? {}) as Data;
  switch (fact.kind) {
    case "work":
      return {
        title: `${str(data.title) ?? "Role"}, ${str(data.employer) ?? "employer unknown"}`,
        subtitle: [span(data), str(data.city)].filter(Boolean).join(" · ") || undefined,
        detail: Array.isArray(data.duties) ? data.duties.slice(0, 2).join(" ") : undefined,
      };
    case "education":
      return {
        title: str(data.qualification) ?? "Qualification",
        subtitle: [str(data.institution), span(data)].filter(Boolean).join(" · ") || undefined,
        detail: str(data.grade) ? `Grade: ${data.grade}` : undefined,
      };
    case "certification":
      return {
        title: str(data.name) ?? "Certification",
        subtitle:
          [str(data.issuer), partialDate(data.issued)].filter(Boolean).join(" · ") || undefined,
        detail: data.expires ? `Expires ${partialDate(data.expires)}` : undefined,
      };
    case "test_score": {
      const components = Array.isArray(data.components)
        ? (data.components as { name: string; score: string }[])
            .map((part) => `${part.name} ${part.score}`)
            .join(", ")
        : "";
      return {
        title: `${String(data.test ?? "Test").replace("_", " ")} ${str(data.overall) ?? ""}`.trim(),
        subtitle: partialDate(data.taken) ? `Taken ${partialDate(data.taken)}` : undefined,
        detail: components || undefined,
      };
    }
    case "language":
      return {
        title: str(data.language) ?? "Language",
        subtitle: LANGUAGE_LEVELS[String(data.level)] ?? str(data.level),
      };
    default:
      return { title: str(data.name) ?? "Skill" };
  }
}

type Field =
  | { key: string; label: string; kind: "text" | "month"; required?: boolean; helper?: string }
  | {
      key: string;
      label: string;
      kind: "select";
      options: { value: string; label: string }[];
      required?: boolean;
    }
  | { key: string; label: string; kind: "country" }
  | { key: string; label: string; kind: "check" };

const FIELDS: Record<FactKind, Field[]> = {
  work: [
    { key: "title", label: "Job title", kind: "text", required: true },
    { key: "employer", label: "Employer", kind: "text", required: true },
    { key: "city", label: "City", kind: "text" },
    { key: "country", label: "Country", kind: "country" },
    { key: "start", label: "Started", kind: "month" },
    { key: "current", label: "I still work here", kind: "check" },
    { key: "end", label: "Finished", kind: "month" },
  ],
  education: [
    {
      key: "qualification",
      label: "Qualification",
      kind: "text",
      required: true,
      helper: "As written on the certificate, e.g. B.Sc. Statistics",
    },
    {
      key: "level",
      label: "Level",
      kind: "select",
      required: true,
      options: Object.entries(LEVELS).map(([value, label]) => ({ value, label })),
    },
    { key: "field", label: "Subject", kind: "text" },
    { key: "institution", label: "School or university", kind: "text", required: true },
    { key: "country", label: "Country", kind: "country" },
    { key: "start", label: "Started", kind: "month" },
    { key: "end", label: "Finished", kind: "month" },
    {
      key: "grade",
      label: "Grade",
      kind: "text",
      helper: "Exactly as written, e.g. Second Class Upper",
    },
  ],
  certification: [
    { key: "name", label: "Certification", kind: "text", required: true },
    { key: "issuer", label: "Issued by", kind: "text" },
    { key: "issued", label: "Issued", kind: "month" },
    { key: "expires", label: "Expires", kind: "month" },
  ],
  test_score: [
    {
      key: "test",
      label: "Test",
      kind: "select",
      required: true,
      options: TESTS.map((test) => ({ value: test, label: test.replace("_", " ") })),
    },
    {
      key: "overall",
      label: "Overall score",
      kind: "text",
      required: true,
      helper: "As written, e.g. 7.5",
    },
    { key: "taken", label: "Taken", kind: "month" },
  ],
  language: [
    { key: "language", label: "Language", kind: "text", required: true },
    {
      key: "level",
      label: "Level",
      kind: "select",
      required: true,
      options: Object.entries(LANGUAGE_LEVELS).map(([value, label]) => ({ value, label })),
    },
  ],
  skill: [{ key: "name", label: "Skill", kind: "text", required: true }],
};

/** Empty strings become null: the API's optional fields are nullable. */
function clean(data: Data): Data {
  return Object.fromEntries(
    Object.entries(data).map(([key, value]) => [key, value === "" ? null : value]),
  );
}

export function FactEditor({
  open,
  onClose,
  fact,
}: {
  open: boolean;
  onClose: () => void;
  /** Editing this fact; adding a new one when absent. */
  fact?: ProfileFact | null;
}) {
  const action = useFactAction();
  const add = useAddFact();
  const [kind, setKind] = useState<FactKind>(fact?.kind ?? "work");
  const [data, setData] = useState<Data>(() => ({ ...((fact?.data as Data) ?? {}) }));
  const [error, setError] = useState<string | null>(null);
  const [missing, setMissing] = useState<string[]>([]);
  const list = countries();
  const fields = FIELDS[kind];
  const busy = action.isPending || add.isPending;

  function save(event: React.FormEvent) {
    event.preventDefault();
    const gaps = fields
      .filter((field) => "required" in field && field.required && !str(data[field.key]))
      .map((field) => field.key);
    setMissing(gaps);
    if (gaps.length) return;
    const payload = clean(kind === "work" && data.current ? { ...data, end: null } : data);
    const done = {
      onSuccess: onClose,
      onError: (err: Error) =>
        setError(err instanceof ApiError ? err.message : "That didn't save. Try again."),
    };
    setError(null);
    if (fact) action.mutate({ type: "edit", fact, data: payload }, done);
    else add.mutate({ kind, data: payload }, done);
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={fact ? `Edit: ${KIND_LABEL[kind].toLowerCase()}` : "Add something we missed"}
      description={
        fact ? "Saving an edit confirms it." : "What you add here is used straight away."
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="fact-editor" loading={busy}>
            Save
          </Button>
        </>
      }
    >
      <form id="fact-editor" noValidate onSubmit={save} className="space-y-4">
        {error && <InlineAlert tone="danger" title={error} />}
        {!fact && (
          <Select
            label="What is it?"
            options={Object.entries(KIND_LABEL).map(([value, label]) => ({ value, label }))}
            value={kind}
            onChange={(event) => {
              setKind(event.target.value as FactKind);
              setData({});
              setMissing([]);
            }}
          />
        )}
        {fields.map((field) => {
          const value = data[field.key];
          const set = (next: unknown) => setData((current) => ({ ...current, [field.key]: next }));
          const fieldError = missing.includes(field.key)
            ? `Enter the ${field.label.toLowerCase()}.`
            : undefined;
          if (field.kind === "check") {
            return (
              <Checkbox
                key={field.key}
                label={field.label}
                checked={Boolean(value)}
                onChange={set}
              />
            );
          }
          if (field.kind === "country") {
            return (
              <Select
                key={field.key}
                label={field.label}
                optional
                options={[
                  { value: "", label: "Not given" },
                  ...list.map((c) => ({ value: c.code, label: c.name })),
                ]}
                value={str(value) ?? ""}
                onChange={(event) => set(event.target.value)}
              />
            );
          }
          if (field.kind === "select") {
            return (
              <Select
                key={field.key}
                label={field.label}
                placeholder="Choose"
                options={field.options}
                value={str(value) ?? ""}
                error={fieldError}
                onChange={(event) => set(event.target.value)}
              />
            );
          }
          if (field.key === "end" && data.current) return null;
          return (
            <TextField
              key={field.key}
              label={field.label}
              type={field.kind === "month" ? "month" : "text"}
              optional={!field.required}
              helper={field.helper ?? (field.kind === "month" ? "Month and year" : undefined)}
              value={str(value) ?? ""}
              error={fieldError}
              onChange={(event) => set(event.target.value)}
            />
          );
        })}
      </form>
    </Dialog>
  );
}
