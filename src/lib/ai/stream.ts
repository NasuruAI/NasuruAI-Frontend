/**
 * Server-sent events for a task the person started (web.md §15).
 *
 * The backend frames task progress as `text/event-stream` at
 * `/api/ai/v1/tasks/{task_id}/events/` and closes the stream on the terminal
 * state. This is a fetch-based reader rather than the browser's built-in
 * EventSource because the session token rides on a bearer header, which
 * EventSource cannot set.
 *
 * The reader hands finished events to the caller; it never blocks a render, so
 * it is safe to call from an effect that drives a query.
 */

import { API_BASE_URL } from "@/lib/api";
import { refreshAccessToken } from "@/lib/auth/client";
import { getAccessToken } from "@/lib/auth/store";
import { useEffect, useRef } from "react";

export type TaskEvent = {
  id?: string;
  state: string;
  progress?: Record<string, unknown>;
  result?: unknown;
  created_at?: string;
  updated_at?: string;
  finished_at?: string | null;
};

export type TaskStreamHandlers = {
  onEvent: (event: TaskEvent) => void;
  signal?: AbortSignal;
};

export type TaskStreamOutcome = "streamed" | "unavailable";

/**
 * Split an SSE buffer into complete `event: task` frames and the partial tail.
 * Pure so the framing rules are unit-testable without a stream.
 */
export function takeSseEvents(buffer: string): { frames: string[]; rest: string } {
  const parts = buffer.split("\n\n");
  const rest = parts.pop() ?? "";
  const frames = parts.filter((part) => part.trim().length > 0);
  return { frames, rest };
}

/** The task payload of one `event: task` frame. */
export function parseTaskEvent(frame: string): TaskEvent {
  const data = frame
    .split("\n")
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice("data:".length))
    .join("\n");
  return JSON.parse(data) as TaskEvent;
}

async function readStream(
  response: Response,
  handlers: TaskStreamHandlers,
): Promise<TaskStreamOutcome> {
  const reader = response.body?.getReader();
  if (!reader) return "unavailable";
  const decoder = new TextDecoder();
  let buffer = "";

  const pump = async (): Promise<boolean> => {
    const { done, value } = await reader.read();
    if (done) {
      const tail = buffer;
      buffer = "";
      if (tail.trim().length > 0) {
        const { frames } = takeSseEvents(tail);
        for (const frame of frames) handlers.onEvent(parseTaskEvent(frame));
      }
      return false;
    }
    buffer += decoder.decode(value, { stream: true });
    const { frames, rest } = takeSseEvents(buffer);
    buffer = rest;
    for (const frame of frames) handlers.onEvent(parseTaskEvent(frame));
    return true;
  };

  let alive = true;
  try {
    while (alive) {
      alive = await pump();
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return "unavailable";
    }
    throw error;
  } finally {
    await reader.cancel().catch(() => undefined);
  }
  return "streamed";
}

/**
 * Open the task's event stream. Returns whether a stream was established.
 * Network failures and non-2xx responses hand back `"unavailable"`, so callers
 * keep their polling fallback instead of silently losing the task.
 */
export async function streamTask(
  taskId: string,
  handlers: TaskStreamHandlers,
): Promise<TaskStreamOutcome> {
  const url = `${API_BASE_URL}/api/ai/v1/tasks/${taskId}/events/`;
  const headers = new Headers({ Accept: "text/event-stream" });
  const token = getAccessToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(url, { headers, signal: handlers.signal });
  if (response.status === 401 && token) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      const retryHeaders = new Headers({ Accept: "text/event-stream" });
      retryHeaders.set("Authorization", `Bearer ${getAccessToken() ?? token}`);
      const retry = await fetch(url, { headers: retryHeaders, signal: handlers.signal });
      if (retry.body) return readStream(retry, handlers);
    }
  }

  if (!response.body) return "unavailable";
  return readStream(response, handlers);
}

/**
 * Stream a task's events into the caller's callback while the task is running.
 * Returns nothing: the caller owns terminal state and keeps its polling
 * fallback when the stream comes back `"unavailable"`.
 */
export function useTaskEvents(
  taskId: string | undefined,
  enabled: boolean,
  handlers: TaskStreamHandlers,
) {
  const handlersRef = useRef(handlers);
  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  useEffect(() => {
    if (!taskId || !enabled) return;
    const controller = new AbortController();
    let closed = false;
    void (async () => {
      const outcome = await streamTask(taskId, {
        ...handlersRef.current,
        signal: controller.signal,
      });
      if (outcome === "unavailable" && !closed) {
        // The stream could not be opened; hand back to the polling fallback.
        handlersRef.current.onEvent({ state: "unavailable" });
      }
    })();
    return () => {
      closed = true;
      controller.abort();
    };
  }, [taskId, enabled]);
}
