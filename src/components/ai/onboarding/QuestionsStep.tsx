"use client";

import { Check, Loader2, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { ApiError } from "@/lib/api";
import { countries } from "@/lib/ai/countries";
import {
  type ProfileFact,
  type Questionnaire,
  type QuestionnaireChanges,
  isReading,
  stepHref,
  useAddFact,
  useDocuments,
  useFactAction,
  useFacts,
  useQuestionnaire,
  useSaveQuestionnaire,
} from "@/lib/ai/onboarding";
import { useMe } from "@/lib/ai/shell";
import { Button } from "../Button";
import { RadioGroup } from "../choice";
import { InlineAlert, Skeleton } from "../feedback";
import { TextArea, TextField } from "../fields";
import { Select } from "../Select";
import { StepActions, StepIntro } from "./OnboardingFrame";

type Answers = QuestionnaireChanges;
type Refusal = NonNullable<Questionnaire["refusals"]>[number];

/** The answers the API needs before the questionnaire counts as complete. */
export const REQUIRED: { field: keyof Answers; label: string; anchor: string }[] = [
  { field: "nationality", label: "Nationality", anchor: "q-nationality" },
  { field: "date_of_birth", label: "Date of birth", anchor: "q-birth" },
  { field: "marital_status", label: "Marital status", anchor: "q-family" },
  { field: "dependants", label: "People who depend on you", anchor: "q-family" },
  { field: "savings_band", label: "Savings", anchor: "q-savings" },
  { field: "previous_refusals", label: "Previous visa refusals", anchor: "q-refusals" },
  { field: "open_to_study", label: "Open to study", anchor: "q-open" },
  { field: "open_to_retrain", label: "Open to retraining", anchor: "q-open" },
];

export function missingAnswers(answers: Answers): typeof REQUIRED {
  return REQUIRED.filter(
    ({ field }) => answers[field] === null || answers[field] === undefined || answers[field] === "",
  );
}

const MARITAL = [
  { value: "single", label: "Single" },
  { value: "married", label: "Married" },
  { value: "partnered", label: "In a civil partnership" },
  { value: "divorced", label: "Divorced" },
  { value: "widowed", label: "Widowed" },
] as const;

const SAVINGS = [
  { value: "under_1m", label: "Under ₦1m" },
  { value: "1m_5m", label: "₦1m to ₦5m" },
  { value: "5m_15m", label: "₦5m to ₦15m" },
  { value: "15m_40m", label: "₦15m to ₦40m" },
  { value: "over_40m", label: "Over ₦40m" },
] as const;

const LEVELS = [
  { value: "native", label: "Native or first language" },
  { value: "C2", label: "C2: as good as a native speaker" },
  { value: "C1", label: "C1: fluent at work" },
  { value: "B2", label: "B2: comfortable in most situations" },
  { value: "B1", label: "B1: everyday conversations" },
  { value: "A2", label: "A2: simple conversations" },
  { value: "A1", label: "A1: a few words and phrases" },
];

const DEPENDANTS = Array.from({ length: 11 }, (_, count) => ({
  value: String(count),
  label: count === 0 ? "None" : count === 10 ? "10 or more" : String(count),
}));

const YES_NO = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
] as const;

const yesNo = (value: boolean | null | undefined) =>
  value === true ? "yes" : value === false ? "no" : null;

function Card({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className="scroll-mt-24 space-y-4 rounded-r-md border border-line bg-surface p-5"
    >
      <h2 id={`${id}-title`} className="text-h3 text-ink">
        {title}
      </h2>
      {children}
    </section>
  );
}

/** Where the CV is up to, while the questions are answered (web.md §4 step 3). */
function CvChip() {
  const documents = useDocuments();
  const cv = documents.data?.find((document) => document.kind === "cv");
  if (!cv) return null;
  const reading = isReading(cv);
  return (
    <p
      role="status"
      className="mb-6 inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 text-body-s text-muted"
    >
      {reading ? (
        <Loader2 aria-hidden className="size-4 animate-spin text-accent" />
      ) : (
        <Check aria-hidden className="size-4 text-success" />
      )}
      {reading
        ? "Reading your CV while you answer…"
        : cv.status === "extracted"
          ? `CV read: ${cv.facts_extracted ?? 0} details for you to check next`
          : "CV stored. You can add your details next."}
    </p>
  );
}

function Languages() {
  const facts = useFacts();
  const add = useAddFact();
  const act = useFactAction();
  const [language, setLanguage] = useState("");
  const [level, setLevel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const known = (facts.data ?? []).filter((fact) => fact.kind === "language");

  function submit() {
    if (language.trim().length < 2 || !level) {
      setError("Enter the language and choose your level.");
      return;
    }
    setError(null);
    add.mutate(
      { kind: "language", data: { language: language.trim(), level } },
      {
        onSuccess: () => {
          setLanguage("");
          setLevel("");
        },
        onError: (err) =>
          setError(err instanceof ApiError ? err.message : "That didn't save. Try again."),
      },
    );
  }

  return (
    <div className="space-y-4">
      {known.length > 0 && (
        <ul className="divide-y divide-line rounded-r-md border border-line">
          {known.map((fact: ProfileFact) => {
            const data = fact.data as { language: string; level: string };
            return (
              <li key={fact.id} className="flex items-center gap-3 px-4 py-2.5">
                <span className="flex-1 text-body text-ink">
                  <span className="font-semibold">{data.language}</span> ·{" "}
                  {LEVELS.find((option) => option.value === data.level)?.label ?? data.level}
                  {fact.status === "unconfirmed" && (
                    <span className="ml-2 text-caption text-info">from your CV</span>
                  )}
                </span>
                <button
                  type="button"
                  aria-label={`Remove ${data.language}`}
                  onClick={() => act.mutate({ type: "reject", fact })}
                  className="flex size-9 items-center justify-center rounded-r-sm text-muted hover:bg-sunken hover:text-danger"
                >
                  <Trash2 aria-hidden className="size-4" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <TextField
          label="Language"
          placeholder="e.g. French"
          value={language}
          onChange={(event) => setLanguage(event.target.value)}
        />
        <Select
          label="Level"
          placeholder="Choose"
          options={LEVELS}
          value={level}
          onChange={(event) => setLevel(event.target.value)}
        />
        <Button
          type="button"
          variant="secondary"
          icon={<Plus aria-hidden className="size-4" />}
          loading={add.isPending}
          onClick={submit}
        >
          Add
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-body-s text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

function Refusals({
  value,
  onChange,
}: {
  value: Refusal[];
  onChange: (next: Refusal[], commit: boolean) => void;
}) {
  const list = useMemo(() => countries(), []);
  const set = (index: number, patch: Partial<Refusal>, commit: boolean) =>
    onChange(
      value.map((row, at) => (at === index ? { ...row, ...patch } : row)),
      commit,
    );
  return (
    <div className="space-y-3">
      {value.map((row, index) => (
        <fieldset
          key={index}
          className="grid gap-3 rounded-r-md border border-line p-3 sm:grid-cols-3"
        >
          <legend className="sr-only">Refusal {index + 1}</legend>
          <Select
            label="Country"
            placeholder="Choose"
            options={list.map((country) => ({ value: country.code, label: country.name }))}
            value={row.country}
            onChange={(event) => set(index, { country: event.target.value }, true)}
          />
          <TextField
            label="Year"
            type="number"
            inputMode="numeric"
            min={1980}
            max={new Date().getFullYear()}
            value={row.year || ""}
            onChange={(event) => set(index, { year: Number(event.target.value) }, false)}
            onBlur={() => onChange(value, true)}
          />
          <div className="flex items-end gap-2">
            <TextField
              label="Type of visa"
              optional
              className="flex-1"
              value={row.visa_type}
              onChange={(event) => set(index, { visa_type: event.target.value }, false)}
              onBlur={() => onChange(value, true)}
            />
            <button
              type="button"
              aria-label={`Remove refusal ${index + 1}`}
              onClick={() =>
                onChange(
                  value.filter((_, at) => at !== index),
                  true,
                )
              }
              className="mb-1 flex size-9 shrink-0 items-center justify-center rounded-r-sm text-muted hover:bg-sunken hover:text-danger"
            >
              <Trash2 aria-hidden className="size-4" />
            </button>
          </div>
        </fieldset>
      ))}
      <Button
        type="button"
        size="sm"
        variant="secondary"
        icon={<Plus aria-hidden className="size-4" />}
        onClick={() =>
          onChange(
            [...value, { country: "", year: new Date().getFullYear(), visa_type: "" }],
            false,
          )
        }
      >
        Add a refusal
      </Button>
    </div>
  );
}

export function QuestionsStep() {
  const router = useRouter();
  const me = useMe();
  const questionnaire = useQuestionnaire();
  const save = useSaveQuestionnaire();
  const list = useMemo(() => countries(), []);
  const [answers, setAnswers] = useState<Answers | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showMissing, setShowMissing] = useState(false);
  const prefilled = useRef(false);

  // Local answers start from the server's once, then lead: a slow save never
  // snaps a control back to an older value.
  if (answers === null && questionnaire.data) {
    const rest: Answers & { completed_at?: string | null } = { ...questionnaire.data };
    delete rest.completed_at;
    setAnswers(rest);
  }

  function commit(changes: Answers) {
    save.mutate(changes, {
      onSuccess: () =>
        setErrors((current) => {
          const next = { ...current };
          for (const key of Object.keys(changes)) delete next[key];
          return next;
        }),
      onError: (error) => {
        if (error instanceof ApiError) {
          const fields = Object.fromEntries(
            Object.entries(error.fieldErrors).map(([key, messages]) => [key, messages[0]]),
          );
          setErrors((current) => ({
            ...current,
            ...(Object.keys(fields).length ? fields : { form: error.message }),
          }));
        } else {
          setErrors((current) => ({
            ...current,
            form: "We couldn't save that. Check your connection.",
          }));
        }
      },
    });
  }

  function answer(changes: Answers, persist = true) {
    setAnswers((current) => ({ ...current, ...changes }));
    if (persist) commit(changes);
  }

  // Nationality is preselected from the phone number's country (web.md §4).
  const origin = me.data?.origin_country;
  useEffect(() => {
    if (prefilled.current || !answers || answers.nationality || !origin) return;
    prefilled.current = true;
    commit({ nationality: origin });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, when both have loaded
  }, [answers, origin]);

  if (!answers) {
    return (
      <>
        <StepIntro title="A few quick questions" />
        {questionnaire.isError ? (
          <InlineAlert
            tone="danger"
            title="We couldn't load your answers. Reload the page to try again."
          />
        ) : (
          <Skeleton className="h-64 w-full" />
        )}
      </>
    );
  }

  const nationality = answers.nationality || origin || "";
  const missing = missingAnswers({ ...answers, nationality });
  const partnered = answers.marital_status === "married" || answers.marital_status === "partnered";

  function next() {
    if (missing.length) {
      setShowMissing(true);
      document.getElementById("missing")?.focus();
      return;
    }
    router.push(stepHref("facts"));
  }

  return (
    <>
      <StepIntro
        title="A few quick questions"
        lead="Visa rules turn on these. Your answers save as you go, and only you and the rules engine see them."
      />
      <CvChip />
      <div className="space-y-4">
        <Card id="q-nationality" title="Your nationality">
          <Select
            label="Nationality"
            helper={
              origin === nationality
                ? "Taken from your phone number. Change it if it's wrong."
                : undefined
            }
            options={list.map((country) => ({ value: country.code, label: country.name }))}
            value={nationality}
            error={errors.nationality}
            onChange={(event) => answer({ nationality: event.target.value })}
          />
          <Select
            label="Another nationality"
            optional
            options={[
              { value: "", label: "None" },
              ...list.map((country) => ({ value: country.code, label: country.name })),
            ]}
            value={answers.second_nationality ?? ""}
            error={errors.second_nationality}
            onChange={(event) => answer({ second_nationality: event.target.value })}
          />
        </Card>

        <Card id="q-birth" title="Your date of birth">
          <TextField
            label="Date of birth"
            type="date"
            helper="Many points systems score age."
            value={answers.date_of_birth ?? ""}
            error={errors.date_of_birth}
            onChange={(event) => answer({ date_of_birth: event.target.value || null }, false)}
            onBlur={(event) => event.target.value && commit({ date_of_birth: event.target.value })}
          />
        </Card>

        <Card id="q-family" title="Your family">
          <RadioGroup
            legend="Marital status"
            value={answers.marital_status || null}
            options={[...MARITAL]}
            onChange={(value) => answer({ marital_status: value })}
          />
          <Select
            label="People who depend on you"
            helper="Children, or anyone else you support who would come with you."
            placeholder="Choose"
            options={DEPENDANTS}
            value={
              answers.dependants === null || answers.dependants === undefined
                ? ""
                : String(answers.dependants)
            }
            error={errors.dependants}
            onChange={(event) => answer({ dependants: Number(event.target.value) })}
          />
          {partnered && (
            <RadioGroup
              legend="Would your partner come with you?"
              value={yesNo(answers.partner_accompanying)}
              options={[...YES_NO]}
              onChange={(value) => answer({ partner_accompanying: value === "yes" })}
            />
          )}
        </Card>

        <Card id="q-savings" title="Your savings">
          <RadioGroup
            legend="Roughly how much could you put towards moving?"
            value={answers.savings_band || null}
            options={[...SAVINGS]}
            onChange={(value) => answer({ savings_band: value })}
          />
          <p className="text-body-s text-muted">
            Most visas ask for proof of funds. A band is enough: we never ask for your bank login.
          </p>
        </Card>

        <Card id="q-refusals" title="Previous visa refusals">
          <RadioGroup
            legend="Have you ever been refused a visa, for any country?"
            value={yesNo(answers.previous_refusals)}
            options={[...YES_NO]}
            onChange={(value) =>
              answer(
                value === "yes"
                  ? { previous_refusals: true }
                  : { previous_refusals: false, refusals: [] },
              )
            }
          />
          <InlineAlert tone="info" title="Why we ask">
            Most applications ask this. A refusal you declare is rarely a problem; one you leave out
            can get you banned for years.
          </InlineAlert>
          {answers.previous_refusals && (
            <Refusals
              value={answers.refusals ?? []}
              onChange={(refusals, persist) =>
                answer({ refusals }, persist && refusals.every((row) => row.country && row.year))
              }
            />
          )}
          {errors.refusals && (
            <p role="alert" className="text-body-s text-danger">
              {errors.refusals}
            </p>
          )}
        </Card>

        <Card id="q-gaps" title="Gaps in your history">
          <TextArea
            label="Any gaps of six months or more in your work or study since school?"
            optional
            helper="Say what you were doing, e.g. “NYSC, 2019 to 2020” or “caring for my mother”. Applications ask you to explain gaps."
            value={answers.history_gaps ?? ""}
            onChange={(event) => answer({ history_gaps: event.target.value }, false)}
            onBlur={(event) => commit({ history_gaps: event.target.value })}
            rows={3}
          />
        </Card>

        <Card id="q-languages" title="Languages you speak">
          <p className="text-body text-muted">
            Besides English. A second language can add points or open routes.
          </p>
          <Languages />
        </Card>

        <Card id="q-open" title="Study and retraining">
          <RadioGroup
            legend="Would you study abroad first, if it led to work?"
            value={yesNo(answers.open_to_study)}
            options={[...YES_NO]}
            onChange={(value) => answer({ open_to_study: value === "yes" })}
          />
          <RadioGroup
            legend="Would you retrain for a job in demand?"
            value={yesNo(answers.open_to_retrain)}
            options={[...YES_NO]}
            onChange={(value) => answer({ open_to_retrain: value === "yes" })}
          />
        </Card>
      </div>

      <p role="status" className="mt-4 min-h-6 text-body-s text-muted">
        {save.isPending ? "Saving…" : errors.form ? "" : save.isSuccess ? "Saved" : ""}
      </p>
      {errors.form && <InlineAlert tone="danger" title={errors.form} />}
      {showMissing && missing.length > 0 && (
        <div id="missing" tabIndex={-1} className="mt-4 outline-none">
          <InlineAlert tone="warning" title="A few answers are still needed">
            <ul className="mt-1 list-disc pl-5">
              {missing.map((item) => (
                <li key={item.field}>
                  <a href={`#${item.anchor}`} className="underline underline-offset-3">
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </InlineAlert>
        </div>
      )}
      <StepActions back={stepHref("upload")}>
        <Button size="lg" onClick={next}>
          Continue
        </Button>
      </StepActions>
    </>
  );
}
