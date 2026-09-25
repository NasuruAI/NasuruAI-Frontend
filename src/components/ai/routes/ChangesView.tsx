"use client";

import { History } from "lucide-react";
import { useRuleChanges } from "@/lib/ai/shell";
import { Button } from "../Button";
import { EmptyState, InlineAlert, Skeleton } from "../feedback";
import { ChangeList } from "./RouteView";

/** /ai/changes/mine: every result of yours that moved, and why (M1-13). */
export function ChangesView() {
  const changes = useRuleChanges();
  return (
    <>
      <h1 className="font-display text-h1 text-ink">Changes that affected you</h1>
      <p className="mt-2 mb-6 text-body-l text-muted">
        When a rule changes or you change your profile, your results are worked out again. Every
        result that moved is listed here, newest first.
      </p>
      {changes.isPending ? (
        <Skeleton className="h-40 w-full" />
      ) : changes.isError ? (
        <InlineAlert
          tone="danger"
          title="We couldn't load your changes."
          action={
            <Button size="sm" variant="secondary" onClick={() => void changes.refetch()}>
              Try again
            </Button>
          }
        />
      ) : !changes.data.length ? (
        <EmptyState icon={<History />} title="Nothing has changed yet">
          When a rule change moves one of your results, you&apos;ll see it here and in your
          notifications.
        </EmptyState>
      ) : (
        <ChangeList changes={changes.data} showRoute />
      )}
    </>
  );
}
