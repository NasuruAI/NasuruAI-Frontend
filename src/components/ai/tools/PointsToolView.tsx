"use client";

import { useMutation } from "@tanstack/react-query";
import { Calculator } from "lucide-react";
import { useState } from "react";
import { ai, unwrap } from "@/lib/ai/client";
import type { PointsResult } from "@/lib/ai/routes";
import { buildInputs, type PointsTool } from "@/lib/ai/tools";
import { Button } from "../Button";
import { Switch } from "../choice";
import { PointsBreakdown } from "../evidence/Money";
import { InlineAlert, Skeleton } from "../feedback";
import { TextField } from "../fields";
import { Select } from "../Select";
import { ToolShell } from "./ToolShell";

const CLB_OPTIONS = [
  { value: "", label: "Not sure" },
  { value: "4", label: "CLB 4 (basic)" },
  { value: "5", label: "CLB 5" },
  { value: "6", label: "CLB 6" },
  { value: "7", label: "CLB 7 (IELTS ~6.0)" },
  { value: "8", label: "CLB 8" },
  { value: "9", label: "CLB 9 (IELTS ~7.0+)" },
  { value: "10", label: "CLB 10" },
];

function usePointsTool(scheme: string) {
  return useMutation({
    mutationFn: (inputs: Record<string, unknown>) =>
      unwrap(
        ai.POST("/api/ai/v1/tools/points/{scheme}/", {
          params: { path: { scheme } },
          body: { inputs },
        }),
      ) as unknown as Promise<PointsResult>,
  });
}

function thresholdOf(result: PointsResult): { points: number; label: string } | undefined {
  const reference = result.reference as { value?: unknown } | null | undefined;
  if (reference && Number.isFinite(Number(reference.value))) {
    return { points: Number(reference.value), label: "the latest draw" };
  }
  if (result.threshold !== null && result.threshold !== undefined) {
    return { points: result.threshold, label: "the pass mark" };
  }
  return undefined;
}

export function PointsToolView({ tool }: { tool: PointsTool }) {
  const points = usePointsTool(tool.scheme);
  const [values, setValues] = useState<Record<string, string | boolean>>({});

  function set(key: string, value: string | boolean) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    points.mutate(buildInputs(tool.fields, values));
  }

  const result = points.data;

  const form = (
    <form onSubmit={submit} className="space-y-5 rounded-r-md border border-line bg-surface p-5">
      {tool.fields.map((field) => {
        if (field.type === "switch") {
          return (
            <Switch
              key={field.key}
              label={field.label}
              description={field.help}
              checked={Boolean(values[field.key])}
              onChange={(checked) => set(field.key, checked)}
            />
          );
        }
        if (field.type === "number") {
          return (
            <TextField
              key={field.key}
              label={field.label}
              helper={field.help}
              type="number"
              inputMode="numeric"
              min={field.min}
              max={field.max}
              value={typeof values[field.key] === "string" ? (values[field.key] as string) : ""}
              onChange={(event) => set(field.key, event.target.value)}
            />
          );
        }
        const options = field.type === "clb" ? CLB_OPTIONS : field.options;
        return (
          <Select
            key={field.key}
            label={field.label}
            helper={field.help}
            options={options}
            value={typeof values[field.key] === "string" ? (values[field.key] as string) : ""}
            onChange={(event) => set(field.key, event.target.value)}
          />
        );
      })}
      <Button type="submit" loading={points.isPending} className="w-full">
        Calculate my score
      </Button>
    </form>
  );

  const resultPanel = (
    <div className="rounded-r-md border border-line bg-surface p-5">
      {points.isPending ? (
        <div aria-busy="true" aria-label="Working out your score">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="mt-4 h-40" />
        </div>
      ) : points.isError ? (
        <InlineAlert tone="danger" title="We couldn't work that out">
          Check your answers and try again.
        </InlineAlert>
      ) : result ? (
        <PointsBreakdown
          scheme={tool.title}
          factors={result.lines.map((line) => ({
            label: line.factor,
            points: line.points,
            max: line.maximum ?? undefined,
            from: line.basis || undefined,
          }))}
          threshold={thresholdOf(result)}
          whatIfs={result.what_ifs.map((option) => ({ label: option.change, delta: option.gain }))}
          source={{ name: result.source_name, url: result.source_url, stale: result.is_stale }}
        />
      ) : (
        <div className="py-8 text-center">
          <Calculator aria-hidden className="mx-auto size-8 text-subtle" />
          <p className="mt-3 text-body text-muted">
            Fill in what you know and press calculate. Every figure shows where it comes from.
          </p>
        </div>
      )}
    </div>
  );

  return <ToolShell title={tool.title} blurb={tool.blurb} form={form} result={resultPanel} />;
}
