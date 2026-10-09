"use client";

/**
 * Paying foreign fees from Nigeria (web.md §11.5 "Fees", web-build F12): per
 * portal, the amount in its own currency and naira, which cards usually
 * work, and alternatives when they don't.
 */

import { CreditCard } from "lucide-react";
import { useState } from "react";
import { useFees } from "@/lib/ai/guidance";
import { useDestination } from "@/lib/ai/shell";
import { COUNTRY_NAMES } from "../Flag";
import { formatDate, formatForeign, formatNaira } from "../evidence/format";
import { SourceLine } from "../evidence/Source";
import { EmptyState, Skeleton } from "../feedback";
import { Select } from "../Select";

const COUNTRIES = ["DE", "GB", "CA", "IE", "NL", "CH", "US"];

export function FeesView() {
  const destination = useDestination();
  const [country, setCountry] = useState("");
  const active = country || destination.data?.active?.country || "";
  const fees = useFees(active);

  return (
    <div>
      <h1 className="font-display text-h2 text-ink">Paying foreign fees from Nigeria</h1>
      <p className="mt-1 text-body text-muted">
        What each portal actually charges, which Nigerian cards usually work, and what to do when
        they don&apos;t.
      </p>

      <div className="mt-6 max-w-xs">
        <Select
          label="Country"
          placeholder="Choose a country"
          value={active}
          onChange={(event) => setCountry(event.target.value)}
          options={COUNTRIES.map((code) => ({ value: code, label: COUNTRY_NAMES[code] ?? code }))}
        />
      </div>

      <div className="mt-6">
        {!active ? null : fees.isPending ? (
          <Skeleton className="h-40" />
        ) : !fees.data?.fees.length ? (
          <EmptyState icon={<CreditCard aria-hidden />} title="Nothing on record yet">
            Our researchers haven&apos;t written up this country&apos;s portal fees yet.
          </EmptyState>
        ) : (
          <ul className="space-y-4">
            {fees.data.fees.map((fee) => (
              <li key={fee.id} className="rounded-r-md border border-line p-5">
                <p className="text-caption font-semibold text-subtle uppercase">{fee.portal}</p>
                <p className="mt-0.5 font-display text-h4 text-ink">{fee.label}</p>
                <p className="mt-1 text-body text-ink">
                  <span className="font-semibold">
                    {formatForeign(Number(fee.amount), fee.currency)}
                  </span>
                  {fee.naira && (
                    <span className="text-muted">
                      {" "}
                      · {formatNaira(Number(fee.naira.converted))}
                    </span>
                  )}
                </p>
                {fee.card_notes && (
                  <p className="mt-3 text-body-s text-ink">
                    <span className="font-semibold">Which cards work: </span>
                    {fee.card_notes}
                  </p>
                )}
                {fee.alternatives && (
                  <p className="mt-1 text-body-s text-ink">
                    <span className="font-semibold">Alternatives: </span>
                    {fee.alternatives}
                  </p>
                )}
                {fee.naira?.as_of && (
                  <p className="mt-1 text-caption text-subtle">
                    Rate as of {formatDate(fee.naira.as_of)}
                  </p>
                )}
                <SourceLine
                  className="mt-2"
                  source={{ name: "Official page", url: fee.source_url, stale: fee.stale }}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
