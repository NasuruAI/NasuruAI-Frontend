"use client";

import { ChevronDown, ChevronUp, Loader2, Sparkles, Undo2 } from "lucide-react";
import { useState } from "react";
import { ApiError } from "@/lib/api";
import {
  type CvBullet,
  type CvRole,
  useReorderBullets,
  useRestoreBullet,
  useTightenBullet,
  useToggleBullet,
} from "@/lib/ai/cv";
import { Button } from "../Button";
import { Checkbox } from "../choice";
import { cx } from "../cx";
import { InlineAlert } from "../feedback";

function move<T>(items: T[], from: number, to: number): T[] {
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

function BulletRow({
  documentId,
  bullet,
  index,
  count,
  onMove,
}: {
  documentId: string;
  bullet: CvBullet;
  index: number;
  count: number;
  onMove: (from: number, to: number) => void;
}) {
  const toggle = useToggleBullet();
  const tighten = useTightenBullet();
  const restore = useRestoreBullet();
  const [comparing, setComparing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function run<T>(action: { mutate: (vars: { id: string; bulletId: string }, opts: object) => T }) {
    setError(null);
    action.mutate(
      { id: documentId, bulletId: bullet.id },
      {
        onError: (err: unknown) =>
          setError(err instanceof ApiError ? err.message : "That didn't work."),
      },
    );
  }

  return (
    <li className={cx("py-2", !bullet.included && "opacity-60")}>
      <div className="flex items-start gap-2">
        <Checkbox
          label={<span className={cx(!bullet.included && "line-through")}>{bullet.text}</span>}
          checked={bullet.included}
          onChange={() => run(toggle)}
          className="flex-1 py-0"
        />
        <div className="flex shrink-0 gap-0.5 pt-1.5">
          <button
            type="button"
            aria-label={`Move up: ${bullet.text}`}
            disabled={index === 0}
            onClick={() => onMove(index, index - 1)}
            className="flex size-8 items-center justify-center rounded-r-sm text-muted hover:bg-sunken disabled:opacity-30"
          >
            <ChevronUp aria-hidden className="size-4" />
          </button>
          <button
            type="button"
            aria-label={`Move down: ${bullet.text}`}
            disabled={index === count - 1}
            onClick={() => onMove(index, index + 1)}
            className="flex size-8 items-center justify-center rounded-r-sm text-muted hover:bg-sunken disabled:opacity-30"
          >
            <ChevronDown aria-hidden className="size-4" />
          </button>
        </div>
      </div>

      {bullet.tightening ? (
        <p role="status" className="ml-8 flex items-center gap-1.5 text-body-s text-muted">
          <Loader2 aria-hidden className="size-3.5 animate-spin text-accent" />
          Writing this again…
        </p>
      ) : (
        <div className="ml-8 flex flex-wrap items-center gap-1">
          <Button
            size="sm"
            variant="tertiary"
            disabled={bullet.tightenings_left === 0}
            loading={tighten.isPending}
            icon={<Sparkles aria-hidden className="size-3.5" />}
            onClick={() => run(tighten)}
          >
            Tighten this bullet
            {bullet.tightenings_left > 0 && (
              <span className="font-normal text-muted"> ({bullet.tightenings_left} left)</span>
            )}
          </Button>
          {bullet.has_original && (
            <button
              type="button"
              aria-expanded={comparing}
              onClick={() => setComparing(!comparing)}
              className="text-body-s font-semibold text-accent underline underline-offset-3"
            >
              {comparing ? "Hide" : "Compare with the original"}
            </button>
          )}
        </div>
      )}

      {comparing && (
        <div className="mt-1 ml-8 rounded-r-sm bg-sunken p-2 text-body-s">
          <p className="text-muted">Before tightening it said:</p>
          <Button
            size="sm"
            variant="tertiary"
            icon={<Undo2 aria-hidden className="size-3.5" />}
            loading={restore.isPending}
            onClick={() => run(restore)}
          >
            Restore this wording
          </Button>
        </div>
      )}

      {bullet.flagged && (
        <InlineAlert tone="warning" title="Check this before you use it" className="mt-2 ml-8">
          The tightened wording couldn&apos;t be fully verified against the original.
        </InlineAlert>
      )}
      {error && (
        <p role="alert" className="ml-8 mt-1 text-body-s text-danger">
          {error}
        </p>
      )}
    </li>
  );
}

/**
 * One role's bullets (web.md §9): include or exclude, reorder, and "tighten
 * this bullet" with a diff. Nothing is ever deleted — a hidden bullet is
 * still here to bring back.
 */
export function CvRoleEditor({
  documentId,
  role,
  roleIndex,
}: {
  documentId: string;
  role: CvRole;
  roleIndex: number;
}) {
  const reorder = useReorderBullets();
  const [error, setError] = useState<string | null>(null);

  function onMove(from: number, to: number) {
    setError(null);
    reorder.mutate(
      { id: documentId, roleIndex, order: move(role.bullets, from, to).map((b) => b.id) },
      { onError: (err) => setError(err instanceof ApiError ? err.message : "That didn't save.") },
    );
  }

  return (
    <div className="rounded-r-md border border-line p-4">
      <p className="font-semibold text-ink">
        {role.title}, {role.employer}
      </p>
      <p className="text-body-s text-muted">
        {[role.place, role.dates].filter(Boolean).join(" · ")}
      </p>
      <ul className="mt-2 divide-y divide-line">
        {role.bullets.map((bullet, index) => (
          <BulletRow
            key={bullet.id}
            documentId={documentId}
            bullet={bullet}
            index={index}
            count={role.bullets.length}
            onMove={onMove}
          />
        ))}
      </ul>
      {error && (
        <p role="alert" className="mt-1 text-body-s text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
