"use client";

/**
 * Arrival checklist (web.md §11.5 "Arrival", web-build F12): registration,
 * bank, SIM, insurance by city, a first-90-days timeline, housing-scam
 * warnings called out on their own.
 */

import { MapPin, TriangleAlert } from "lucide-react";
import { useState } from "react";
import {
  type ArrivalCategory,
  type ArrivalItem,
  useArrival,
  useSetArrivalDone,
} from "@/lib/ai/guidance";
import { useDestination } from "@/lib/ai/shell";
import { Checkbox } from "../choice";
import { COUNTRY_NAMES } from "../Flag";
import { daysBetween, formatDate, relativeDays } from "../evidence/format";
import { SourceLine } from "../evidence/Source";
import { EmptyState, Skeleton } from "../feedback";
import { Select } from "../Select";
import { TextField } from "../fields";

const CATEGORY_LABEL: Record<ArrivalCategory, string> = {
  registration: "Registration",
  immigration: "Immigration status",
  bank: "Banking",
  health: "Health insurance and GP",
  tax: "Tax and social security",
  housing: "Housing",
  other: "Other",
};

const COUNTRIES = ["DE", "GB", "CA", "IE", "NL", "CH", "US"];

function Item({
  item,
  onToggle,
  loading,
}: {
  item: ArrivalItem;
  onToggle: (done: boolean) => void;
  loading: boolean;
}) {
  return (
    <li
      className={
        item.scam_warning
          ? "rounded-r-md border border-warning-line bg-warning-bg p-4"
          : "rounded-r-md border border-line p-4"
      }
    >
      <Checkbox
        label={item.title}
        description={item.detail}
        checked={Boolean(item.done_at)}
        disabled={loading}
        onChange={onToggle}
      />
      {item.scam_warning && (
        <p className="mt-2 flex items-center gap-1.5 text-body-s font-semibold text-warning">
          <TriangleAlert aria-hidden className="size-4" /> Known scam pattern: read this carefully.
        </p>
      )}
      {item.due_by && (
        <p className="mt-1 text-body-s text-muted">
          Due {formatDate(item.due_by)} ({relativeDays(daysBetween(item.due_by))})
        </p>
      )}
      <SourceLine
        className="mt-2"
        source={{ name: "Official page", url: item.source_url, stale: item.stale }}
      />
    </li>
  );
}

export function ArrivalView() {
  const destination = useDestination();
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [arrivedOn, setArrivedOn] = useState("");
  const active = country || destination.data?.active?.country || "";
  const items = useArrival(active, city, arrivedOn);
  const setDone = useSetArrivalDone(active, city, arrivedOn);

  const grouped = new Map<ArrivalCategory, ArrivalItem[]>();
  for (const item of items.data ?? []) {
    grouped.set(item.category, [...(grouped.get(item.category) ?? []), item]);
  }

  return (
    <div>
      <h1 className="font-display text-h2 text-ink">Your first weeks</h1>
      <p className="mt-1 text-body text-muted">
        Registration, banking, health insurance and the scams to watch for, by city.
      </p>

      <div className="mt-6 grid max-w-xl gap-4 sm:grid-cols-3">
        <Select
          label="Country"
          placeholder="Choose a country"
          value={active}
          onChange={(event) => setCountry(event.target.value)}
          options={COUNTRIES.map((code) => ({ value: code, label: COUNTRY_NAMES[code] ?? code }))}
        />
        <TextField
          label="City"
          optional
          value={city}
          onChange={(event) => setCity(event.target.value)}
        />
        <TextField
          label="Arrival date"
          type="date"
          optional
          value={arrivedOn}
          onChange={(event) => setArrivedOn(event.target.value)}
        />
      </div>

      <div className="mt-6">
        {!active ? null : items.isPending ? (
          <Skeleton className="h-40" />
        ) : !items.data?.length ? (
          <EmptyState icon={<MapPin aria-hidden />} title="Nothing on record yet">
            Our researchers haven&apos;t written this city&apos;s arrival checklist yet.
          </EmptyState>
        ) : (
          <div className="space-y-6">
            {[...grouped.entries()].map(([category, categoryItems]) => (
              <section key={category}>
                <h2 className="text-h4 text-ink">{CATEGORY_LABEL[category]}</h2>
                <ul className="mt-3 space-y-3">
                  {categoryItems.map((item) => (
                    <Item
                      key={item.id}
                      item={item}
                      loading={setDone.isPending}
                      onToggle={(done) => setDone.mutate({ itemId: item.id, done })}
                    />
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
