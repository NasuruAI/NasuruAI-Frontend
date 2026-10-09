"use client";

/**
 * Overall score across completed sessions, oldest to newest (web.md §11.6
 * "history of sessions with a progress chart") — a hand-rolled inline SVG,
 * matching how every other chart in this design system is built.
 */

import type { Session } from "@/lib/ai/coaching";
import { formatDate } from "../evidence/format";

export function ProgressChart({ sessions }: { sessions: Session[] }) {
  const points = [...sessions]
    .filter((s) => s.summary)
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
  if (points.length < 2) return null;

  const width = 600;
  const height = 140;
  const padding = { top: 12, right: 8, bottom: 20, left: 8 };
  const x = (i: number) =>
    padding.left + (i / (points.length - 1)) * (width - padding.left - padding.right);
  const y = (score: number) =>
    height - padding.bottom - ((score - 1) / 4) * (height - padding.top - padding.bottom);

  const path = points
    .map(
      (point, i) =>
        `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(point.summary!.overall).toFixed(1)}`,
    )
    .join(" ");

  return (
    <div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`Overall score from ${points[0].summary!.overall} to ${points[points.length - 1].summary!.overall} out of 5, across ${points.length} sessions`}
        className="w-full"
        preserveAspectRatio="none"
      >
        <path d={path} fill="none" className="stroke-accent" strokeWidth={2} />
        {points.map((point, i) => (
          <circle
            key={point.id}
            cx={x(i)}
            cy={y(point.summary!.overall)}
            r={3}
            className="fill-accent"
          />
        ))}
      </svg>
      <div className="mt-1 flex items-center justify-between text-caption text-subtle">
        <span>{formatDate(points[0].created_at)}</span>
        <span>{formatDate(points[points.length - 1].created_at)}</span>
      </div>
    </div>
  );
}
