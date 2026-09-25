"use client";

import { ArrowLeft, Calculator, Check, Plus } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ApiError } from "@/lib/api";
import {
  CALCULATORS,
  type CalculatorKind,
  type PointsResult,
  slugKey,
  useAddTodo,
  usePoints,
  useWhatIf,
} from "@/lib/ai/routes";
import { Button } from "../Button";
import { Switch } from "../choice";
import { PointsBreakdown } from "../evidence/Money";
import { EmptyState, InlineAlert, Skeleton } from "../feedback";
import { useToast } from "../Toast";
import { formatValue, humanise } from "./RouteView";

/** The bar to clear: the scheme's pass mark, or for CRS the latest draw. */
export function thresholdOf(result: PointsResult): { points: number; label: string } | undefined {
  const reference = result.reference as { label?: string; value?: unknown } | null | undefined;
  if (reference && Number.isFinite(Number(reference.value))) {
    return { points: Number(reference.value), label: "the latest draw" };
  }
  if (result.threshold !== null) return { points: result.threshold, label: "the pass mark" };
  return undefined;
}

/** Several what-ifs at once: their overrides merged, later ones winning. */
export function mergeOverrides(
  whatIfs: PointsResult["what_ifs"],
  chosen: Set<string>,
): Record<string, unknown> | null {
  const picked = whatIfs.filter((whatIf) => chosen.has(whatIf.change));
  if (!picked.length) return null;
  return Object.assign({}, ...picked.map((whatIf) => whatIf.overrides));
}

function Inputs({ inputs }: { inputs: Record<string, unknown> }) {
  const shown = Object.entries(inputs).filter(
    ([, value]) =>
      value !== null && value !== undefined && value !== false && value !== 0 && value !== "none",
  );
  if (!shown.length) return null;
  return (
    <dl className="mt-2 grid gap-x-4 gap-y-1 text-body-s sm:grid-cols-[auto_1fr]">
      {shown.map(([key, value]) => (
        <div key={key} className="contents">
          <dt className="text-muted">{humanise(key)}</dt>
          <dd className="text-ink">{formatValue(value)}</dd>
        </div>
      ))}
    </dl>
  );
}

/** /ai/calculators/[kind] (web.md §6.4). */
export function CalculatorView({ kind }: { kind: CalculatorKind }) {
  const { scheme, title } = CALCULATORS[kind];
  const points = usePoints(scheme);
  const [chosen, setChosen] = useState<Set<string>>(() => new Set());
  const overrides = useMemo(
    () => (points.data ? mergeOverrides(points.data.what_ifs, chosen) : null),
    [points.data, chosen],
  );
  const whatIf = useWhatIf(scheme, overrides);
  const add = useAddTodo();
  const toast = useToast();
  const [added, setAdded] = useState<Set<string>>(() => new Set());
  const [error, setError] = useState<string | null>(null);

  if (points.isPending) {
    return (
      <div aria-busy="true" aria-label="Working out your points" className="space-y-3">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  if (points.isError) {
    return (
      <EmptyState icon={<Calculator />} title={`${title} isn't available yet`}>
        {points.error instanceof ApiError && points.error.code === "no_scheme"
          ? "Our researchers haven't published the points table in force today."
          : "We couldn't work out your points. Reload the page to try again."}
      </EmptyState>
    );
  }

  const result = points.data;
  const threshold = thresholdOf(result);
  const combined = overrides ? whatIf.data : undefined;

  function toggle(change: string, on: boolean) {
    setChosen((current) => {
      const next = new Set(current);
      if (on) next.add(change);
      else next.delete(change);
      return next;
    });
  }

  function addToPlan(change: string, gain: number) {
    setError(null);
    add.mutate(
      {
        key: `points:${scheme}:${slugKey(change)}`,
        title: change,
        detail: `Adds ${gain} points to your ${title} score.`,
      },
      {
        onSuccess: () => {
          setAdded((current) => new Set(current).add(change));
          toast({ message: `Added to your plan: ${change}` });
        },
        onError: (err) =>
          setError(err instanceof ApiError ? err.message : "That didn't save. Try again."),
      },
    );
  }

  return (
    <>
      <Link
        href="/ai/routes"
        className="mb-4 inline-flex items-center gap-1 text-body-s font-semibold text-accent hover:underline"
      >
        <ArrowLeft aria-hidden className="size-4" /> Your routes
      </Link>
      <h1 className="font-display text-h1 text-ink">{title}</h1>
      <InlineAlert
        tone="info"
        title="Worked out from the details you confirmed"
        className="mt-4 mb-6"
      >
        <Inputs inputs={result.inputs} />
        {result.assumptions.length > 0 && (
          <ul className="mt-2 list-disc space-y-1 pl-5 text-body-s">
            {result.assumptions.map((assumption) => (
              <li key={assumption}>{assumption}</li>
            ))}
          </ul>
        )}
        <Link
          href="/ai/profile"
          className="mt-2 inline-block text-body-s font-semibold text-accent underline underline-offset-3"
        >
          Check your details
        </Link>
      </InlineAlert>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <section
          aria-labelledby="score-heading"
          className="rounded-r-md border border-line bg-surface p-5"
        >
          <h2 id="score-heading" className="sr-only">
            Your score
          </h2>
          <PointsBreakdown
            scheme={title}
            factors={result.lines.map((line) => ({
              label: line.factor,
              points: line.points,
              max: line.maximum ?? undefined,
              from: line.basis || undefined,
            }))}
            threshold={threshold}
            source={{ name: result.source_name, url: result.source_url, stale: result.is_stale }}
          />
        </section>

        <section aria-labelledby="whatif-heading" className="space-y-4">
          <div className="rounded-r-md border border-line bg-surface p-5">
            <h2 id="whatif-heading" className="text-h3 text-ink">
              What if…
            </h2>
            {result.what_ifs.length === 0 ? (
              <p className="mt-2 text-body-s text-muted">
                Nothing we check would add points for you right now.
              </p>
            ) : (
              <>
                <p className="mt-1 text-body-s text-muted">
                  Try changes to see your score. Nothing here changes your profile.
                </p>
                <ul className="mt-3 divide-y divide-line">
                  {result.what_ifs.map((option) => (
                    <li key={option.change} className="py-3">
                      <Switch
                        label={option.change}
                        description={`+${option.gain} points on its own`}
                        checked={chosen.has(option.change)}
                        onChange={(on) => toggle(option.change, on)}
                      />
                      <div className="mt-2 pl-1">
                        {added.has(option.change) ? (
                          <p className="flex items-center gap-1.5 text-body-s font-semibold text-success">
                            <Check aria-hidden className="size-4" /> In your plan
                          </p>
                        ) : (
                          <Button
                            size="sm"
                            variant="tertiary"
                            icon={<Plus aria-hidden className="size-4" />}
                            loading={add.isPending && add.variables?.title === option.change}
                            onClick={() => addToPlan(option.change, option.gain)}
                          >
                            Add this improvement to my plan
                          </Button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
          {error && <InlineAlert tone="danger" title={error} />}
          {overrides && (
            <div aria-live="polite" className="rounded-r-md border border-info-line bg-info-bg p-5">
              <p className="text-body-s text-muted">
                With {chosen.size === 1 ? "this change" : "these changes"}
              </p>
              {combined ? (
                <p className="mt-1">
                  <span className="text-metric-xl tabular-nums text-ink">{combined.total}</span>{" "}
                  <span className="text-body font-semibold text-success">
                    +{combined.total - result.total}
                  </span>
                </p>
              ) : (
                <Skeleton className="mt-2 h-10 w-24" />
              )}
              {combined && threshold && (
                <p className="mt-1 text-body-s text-ink">
                  {combined.total >= threshold.points
                    ? `Clears ${threshold.label} (${threshold.points}).`
                    : `${threshold.points - combined.total} below ${threshold.label}.`}
                </p>
              )}
              {whatIf.isError && (
                <p className="mt-1 text-body-s text-danger">We couldn&apos;t work that out.</p>
              )}
            </div>
          )}
        </section>
      </div>
    </>
  );
}
