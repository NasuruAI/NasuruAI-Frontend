"use client";

import { CalendarClock, Download } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { ApiError } from "@/lib/api";
import { downloadDeadlinesIcs, useMyDeadlines } from "@/lib/ai/study";
import { Button } from "../Button";
import { CountdownChip } from "../evidence/Status";
import { EmptyState, InlineAlert, Skeleton } from "../feedback";
import { Select } from "../Select";
import { useToast } from "../Toast";

const TYPES = [
  { value: "", label: "All types" },
  { value: "application", label: "Application" },
];

/** /ai/deadlines (web.md §10.4): every deadline on your board, soonest first. */
export function DeadlinesView() {
  const [type, setType] = useState("");
  const deadlines = useMyDeadlines(type);
  const toast = useToast();
  const [downloading, setDownloading] = useState(false);

  async function addToCalendar() {
    setDownloading(true);
    try {
      await downloadDeadlinesIcs();
    } catch (err) {
      toast({
        message: err instanceof ApiError ? err.message : "That didn't download. Try again.",
      });
    } finally {
      setDownloading(false);
    }
  }

  return (
    <>
      <header className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-overline text-muted uppercase">Deadlines</p>
          <h1 className="mt-1 font-display text-h1 text-ink">Every deadline, soonest first</h1>
        </div>
        <Button
          variant="secondary"
          size="sm"
          icon={<Download aria-hidden className="size-4" />}
          loading={downloading}
          onClick={() => void addToCalendar()}
        >
          Add to calendar
        </Button>
      </header>

      <div className="mb-4">
        <Select
          label="Type"
          options={TYPES}
          value={type}
          onChange={(event) => setType(event.target.value)}
          className="w-48"
        />
      </div>

      {deadlines.isPending ? (
        <div className="space-y-3" aria-busy="true" aria-label="Loading deadlines">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : deadlines.isError ? (
        <InlineAlert tone="danger" title="We couldn't load your deadlines." />
      ) : !deadlines.data?.results.length ? (
        <EmptyState icon={<CalendarClock />} title="No deadlines yet">
          Save a programme or a job and its deadline shows here.{" "}
          <Link href="/ai/study" className="font-semibold text-accent underline underline-offset-3">
            Find programmes
          </Link>
        </EmptyState>
      ) : (
        <ul className="divide-y divide-line rounded-r-md border border-line">
          {deadlines.data.results.map((deadline) => (
            <li
              key={`${deadline.id}-${deadline.date}`}
              className="flex flex-wrap items-center justify-between gap-3 p-4"
            >
              <div className="min-w-0">
                <Link
                  href={`/ai/track/${deadline.id}`}
                  className="font-semibold text-ink hover:underline hover:underline-offset-3"
                >
                  {deadline.organisation}
                </Link>
                <p className="text-body-s text-muted">{deadline.title}</p>
                {deadline.note && <p className="text-caption text-subtle">{deadline.note}</p>}
              </div>
              <CountdownChip date={deadline.date} label="Deadline" />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
