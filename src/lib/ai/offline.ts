"use client";

/**
 * Offline action queue (web.md §14).
 *
 * When a write cannot reach the server because the connection is down, the
 * action is kept in localStorage with the exact request it needs, and the UI
 * says so ("will send when you're online"). On reconnect the queue replays in
 * order; an action the server now refuses is dropped with a visible message
 * rather than retried forever.
 *
 * Only actions that are safe to replay belong here: idempotent writes, or
 * writes carrying the version they were based on. A payment or a submission
 * never does.
 */

import { useSyncExternalStore } from "react";
import { publishToast } from "@/lib/api";
import { ai, unwrap } from "./client";
import type { Todo } from "./plan";

const STORAGE_KEY = "nasuru.ai.offline-queue";
const EVENT = "nasuru:offline-queue";
const MAX_ACTIONS = 25;

export type OfflineAction =
  | {
      id: string;
      kind: "todo.set";
      label: string;
      createdAt: string;
      payload: { todoId: string; version: number; done: boolean };
    }
  | {
      id: string;
      kind: "job.save";
      label: string;
      createdAt: string;
      payload: { jobId: string; saved: boolean };
    };

export type OfflineKind = OfflineAction["kind"];

function readRaw(): OfflineAction[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isAction);
  } catch {
    return [];
  }
}

// useSyncExternalStore compares snapshots by identity: without a cache, every
// call returns a new array and React re-renders forever.
let cached: OfflineAction[] | null = null;

function read(): OfflineAction[] {
  if (cached === null) cached = readRaw();
  return cached;
}

function isAction(value: unknown): value is OfflineAction {
  if (!value || typeof value !== "object") return false;
  const action = value as Partial<OfflineAction>;
  return (
    typeof action.id === "string" &&
    typeof action.label === "string" &&
    typeof action.createdAt === "string" &&
    (action.kind === "todo.set" || action.kind === "job.save") &&
    typeof action.payload === "object" &&
    action.payload !== null
  );
}

function write(actions: OfflineAction[]) {
  cached = actions;
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(actions));
  } catch {
    // Private mode: the action still runs from memory this session.
  }
  window.dispatchEvent(new Event(EVENT));
}

/** A stable key so ticking the same to-do twice keeps only the latest intent. */
export function actionKey(action: OfflineAction): string {
  if (action.kind === "todo.set") return `todo.set:${action.payload.todoId}`;
  return `job.save:${action.payload.jobId}`;
}

export function enqueue(action: OfflineAction): OfflineAction[] {
  const existing = read();
  const key = actionKey(action);
  const next = [...existing.filter((item) => actionKey(item) !== key), action].slice(-MAX_ACTIONS);
  write(next);
  return next;
}

export function enqueueTodoSet(todo: Todo, done: boolean): OfflineAction[] {
  return enqueue({
    id: crypto.randomUUID(),
    kind: "todo.set",
    label: done ? `Tick “${todo.title}”` : `Reopen “${todo.title}”`,
    createdAt: new Date().toISOString(),
    payload: { todoId: todo.id, version: todo.version ?? 1, done },
  });
}

export function enqueueJobSave(jobId: string, title: string, saved: boolean): OfflineAction[] {
  return enqueue({
    id: crypto.randomUUID(),
    kind: "job.save",
    label: saved ? `Save “${title}”` : `Remove “${title}”`,
    createdAt: new Date().toISOString(),
    payload: { jobId, saved },
  });
}

async function run(action: OfflineAction): Promise<void> {
  if (action.kind === "todo.set") {
    await unwrap(
      ai.PATCH("/api/ai/v1/me/plan/todos/{todo_id}/", {
        params: { path: { todo_id: action.payload.todoId } },
        body: { version: action.payload.version, done: action.payload.done },
      }),
    );
    return;
  }
  if (action.payload.saved) {
    await unwrap(
      ai.POST("/api/ai/v1/jobs/{job_id}/save/", {
        params: { path: { job_id: action.payload.jobId } },
      }),
    );
  } else {
    await unwrap(
      ai.DELETE("/api/ai/v1/jobs/{job_id}/save/", {
        params: { path: { job_id: action.payload.jobId } },
      }),
    );
  }
}

let flushing = false;

/**
 * Replay the queue. Network failures stop the run (the rest stay queued); a
 * refusal from the server drops that action and says why.
 */
export async function flushOfflineQueue(): Promise<{ sent: number; dropped: number }> {
  if (typeof window === "undefined" || !navigator.onLine || flushing) {
    return { sent: 0, dropped: 0 };
  }
  const actions = read();
  if (actions.length === 0) return { sent: 0, dropped: 0 };

  flushing = true;
  let sent = 0;
  let dropped = 0;
  try {
    for (const action of actions) {
      try {
        await run(action);
        sent += 1;
        write(read().filter((item) => item.id !== action.id));
      } catch (error) {
        const status =
          error && typeof error === "object" && "status" in error
            ? Number((error as { status: unknown }).status)
            : 0;
        if (status === 0) {
          // Still offline (or the server is unreachable): keep the rest.
          break;
        }
        dropped += 1;
        write(read().filter((item) => item.id !== action.id));
        publishToast(`Could not send “${action.label}”: it is out of date.`, "error");
      }
    }
  } finally {
    flushing = false;
  }

  if (sent > 0) {
    publishToast(`${sent} queued ${sent === 1 ? "action" : "actions"} sent.`, "success");
  }
  return { sent, dropped };
}

function subscribe(callback: () => void) {
  window.addEventListener(EVENT, callback);
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener(EVENT, callback);
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

/** The current queue, kept in sync across components and tabs. */
export function useOfflineQueue(): OfflineAction[] {
  return useSyncExternalStore(
    subscribe,
    () => read(),
    () => [],
  );
}
