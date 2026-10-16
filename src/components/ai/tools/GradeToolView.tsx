"use client";

import { useMutation } from "@tanstack/react-query";
import { GraduationCap } from "lucide-react";
import { useState } from "react";
import { ai, unwrap } from "@/lib/ai/client";
import { Button } from "../Button";
import { InlineAlert, Skeleton } from "../feedback";
import { TextField } from "../fields";
import { ToolShell } from "./ToolShell";

type GradeResult = {
  as_written: string;
  uk_class: string | null;
  uk_class_label: string | null;
  german_grade: string | null;
  cgpa: string | null;
  scale: string | null;
  working: string;
  indicative: boolean;
};

function useGradeTool() {
  return useMutation({
    mutationFn: (grade: string) =>
      unwrap(
        ai.POST("/api/ai/v1/tools/grade/", { body: { grade } }),
      ) as unknown as Promise<GradeResult>,
  });
}

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-r-sm border border-line bg-canvas p-3">
      <p className="text-caption uppercase text-muted">{label}</p>
      <p className="mt-0.5 text-metric-s tabular-nums text-ink">{value}</p>
    </div>
  );
}

export function GradeToolView() {
  const grade = useGradeTool();
  const [value, setValue] = useState("");
  const result = grade.data;

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (value.trim()) grade.mutate(value.trim());
  }

  const form = (
    <form onSubmit={submit} className="space-y-4 rounded-r-md border border-line bg-surface p-5">
      <TextField
        label="Your degree result"
        helper="A CGPA like “4.2 / 5.0”, or a class like “Second Class Upper” or “2:1”."
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="e.g. 4.2 / 5.0"
      />
      <Button type="submit" loading={grade.isPending} disabled={!value.trim()} className="w-full">
        Convert my grade
      </Button>
    </form>
  );

  const resultPanel = (
    <div className="rounded-r-md border border-line bg-surface p-5">
      {grade.isPending ? (
        <div aria-busy="true" aria-label="Converting your grade">
          <Skeleton className="h-10 w-28" />
          <Skeleton className="mt-4 h-24" />
        </div>
      ) : grade.isError ? (
        <InlineAlert tone="danger" title="We couldn't convert that">
          Try a CGPA like “4.2 / 5.0” or a class name.
        </InlineAlert>
      ) : result ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <Figure label="UK class" value={result.uk_class_label ?? "—"} />
            <Figure label="German grade" value={result.german_grade ?? "—"} />
          </div>
          {result.working && (
            <div>
              <p className="text-caption uppercase text-muted">How this was worked out</p>
              <p className="mt-1 text-body-s text-ink">{result.working}</p>
            </div>
          )}
          {result.indicative && (
            <p className="text-body-s text-muted">
              Indicative only. Universities and credential bodies make the final call.
            </p>
          )}
        </div>
      ) : (
        <div className="py-8 text-center">
          <GraduationCap aria-hidden className="mx-auto size-8 text-subtle" />
          <p className="mt-3 text-body text-muted">
            Enter your result to see it on the UK and German scales, with the method shown.
          </p>
        </div>
      )}
    </div>
  );

  return (
    <ToolShell
      title="Grade converter"
      blurb="Convert your Nigerian degree result to the UK and German scales — with the exact method, not a guess."
      form={form}
      result={resultPanel}
    />
  );
}
