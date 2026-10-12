"use client";

/**
 * Profile (web.md §12 "/profile"): the confirmed facts the rules engine
 * sees, your occupation code, and how the questionnaire stands.
 */

import { Briefcase, FileSearch, Plus } from "lucide-react";
import { useState } from "react";
import { ApiError } from "@/lib/api";
import {
  type ProfileFact,
  searchOccupations,
  useFactAction,
  useFacts,
  useOccupation,
  useSetOccupation,
} from "@/lib/ai/onboarding";
import { useMe } from "@/lib/ai/shell";
import { Button } from "../Button";
import { FactCard } from "../evidence/cards";
import { EmptyState, InlineAlert, ProgressBar, Skeleton } from "../feedback";
import { Combobox, type ComboboxOption } from "../Select";
import { factView, FactEditor, KIND_LABEL } from "../onboarding/facts";

const ORDER = ["work", "education", "certification", "test_score", "language", "skill"];
const SYSTEM_LABEL: Record<string, string> = { isco08: "ISCO-08", soc2020: "UK SOC" };

function key(system: string, code: string) {
  return `${system}:${code}`;
}

function OccupationCard() {
  const occupation = useOccupation();
  const choose = useSetOccupation();
  const [searched, setSearched] = useState<ComboboxOption | null>(null);
  const [error, setError] = useState<string | null>(null);

  function pick(system: string, code: string) {
    setError(null);
    choose.mutate(
      { system, code },
      { onError: (err) => setError(err instanceof ApiError ? err.message : "That didn't save.") },
    );
  }

  return (
    <section className="rounded-r-md border border-line p-5">
      <h2 className="flex items-center gap-2 text-h4 text-ink">
        <Briefcase aria-hidden className="size-5 text-subtle" /> Occupation
      </h2>
      {occupation.isPending ? (
        <Skeleton className="mt-3 h-10" />
      ) : occupation.data ? (
        <p className="mt-2 text-body text-ink">
          {occupation.data.title}{" "}
          <span className="font-mono text-body-s text-muted">
            {SYSTEM_LABEL[occupation.data.system] ?? occupation.data.system} {occupation.data.code}
          </span>
        </p>
      ) : (
        <p className="mt-2 text-body-s text-muted">Not set yet.</p>
      )}
      <div className="mt-3">
        <Combobox
          label="Search for your occupation"
          hideLabel
          placeholder="Search by job title…"
          value={searched}
          onChange={(option) => {
            setSearched(option);
            if (option) {
              const [system, code] = option.value.split(":");
              pick(system, code);
            }
          }}
          search={async (query) =>
            (await searchOccupations(query)).map((result) => ({
              value: key(result.system, result.code),
              label: result.title,
              code: `${SYSTEM_LABEL[result.system] ?? result.system} ${result.code}`,
            }))
          }
        />
      </div>
      {error && <InlineAlert tone="danger" title={error} className="mt-2" />}
    </section>
  );
}

export function ProfileView() {
  const me = useMe();
  const facts = useFacts({});
  const act = useFactAction();
  const [editing, setEditing] = useState<ProfileFact | "new" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onError = (err: Error) =>
    setError(
      err instanceof ApiError && err.status === 409
        ? "That changed on another device. We've loaded the latest version."
        : "That didn't save. Try again.",
    );

  const list = [...(facts.data ?? [])].sort(
    (a, b) => ORDER.indexOf(a.kind) - ORDER.indexOf(b.kind),
  );
  const confirmedCount = list.filter((fact) => fact.status === "confirmed").length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-h2 text-ink">Profile</h1>
        {me.data && (
          <p className="mt-1 text-body text-muted">
            {me.data.first_name} · {me.data.email}
          </p>
        )}
      </div>

      <OccupationCard />

      <section>
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-h3 text-ink">Confirmed facts</h2>
          <Button
            size="sm"
            variant="secondary"
            icon={<Plus aria-hidden className="size-4" />}
            onClick={() => setEditing("new")}
          >
            Add something
          </Button>
        </div>
        <p className="mt-1 text-body-s text-muted">
          What the rules engine sees. Unconfirmed details are never used.
        </p>
        {list.length > 0 && (
          <div className="mt-4">
            <ProgressBar
              value={confirmedCount}
              max={list.length}
              label={`${confirmedCount} of ${list.length} confirmed`}
            />
          </div>
        )}
        {error && <InlineAlert tone="danger" title={error} className="mt-3" />}

        <div className="mt-4">
          {facts.isPending ? (
            <div className="space-y-3">
              <Skeleton className="h-36 w-full" />
              <Skeleton className="h-36 w-full" />
            </div>
          ) : list.length === 0 ? (
            <EmptyState icon={<FileSearch aria-hidden />} title="Nothing here yet">
              Add your work, education and other details so the rules can see them.
            </EmptyState>
          ) : (
            <ul className="space-y-3">
              {list.map((fact) => {
                const view = factView(fact);
                return (
                  <li key={fact.id}>
                    <FactCard
                      kindLabel={KIND_LABEL[fact.kind]}
                      title={view.title}
                      subtitle={view.subtitle}
                      detail={view.detail}
                      confirmed={fact.status === "confirmed"}
                      onConfirm={() => act.mutate({ type: "confirm", fact }, { onError })}
                      onEdit={() => setEditing(fact)}
                      onDelete={() => act.mutate({ type: "reject", fact }, { onError })}
                    />
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>

      <FactEditor
        open={editing !== null}
        onClose={() => setEditing(null)}
        fact={editing === "new" ? null : editing}
      />
    </div>
  );
}
