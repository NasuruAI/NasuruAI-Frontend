import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Todo } from "./plan";

const patch = vi.fn();
const post = vi.fn();
const del = vi.fn();

vi.mock("./client", () => ({
  ai: { PATCH: patch, POST: post, DELETE: del },
  unwrap: vi.fn(async (value: unknown) => value),
}));

const { actionKey, enqueue, enqueueJobSave, enqueueTodoSet, flushOfflineQueue } =
  await import("./offline");

const STORAGE_KEY = "nasuru.ai.offline-queue";

function todo(overrides: Partial<Todo> = {}): Todo {
  return {
    id: "todo-1",
    key: "de.funds",
    title: "Show proof of funds",
    route_code: "de.work",
    status: "open",
    version: 3,
    ...overrides,
  } as Todo;
}

beforeEach(() => {
  window.localStorage.clear();
  vi.clearAllMocks();
  patch.mockResolvedValue({});
  post.mockResolvedValue({});
  del.mockResolvedValue({});
  Object.defineProperty(navigator, "onLine", { value: true, configurable: true });
});

describe("offline queue", () => {
  it("keeps the latest intent for the same to-do", () => {
    enqueueTodoSet(todo(), true);
    enqueueTodoSet(todo(), false);

    const queued = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]");
    expect(queued).toHaveLength(1);
    expect(queued[0].payload).toMatchObject({ todoId: "todo-1", done: false });
  });

  it("keeps a to-do and a job as separate actions", () => {
    enqueueTodoSet(todo(), true);
    enqueueJobSave("job-1", "Backend engineer", true);

    const queued = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]");
    expect(queued).toHaveLength(2);
    expect(actionKey(queued[0])).toBe("todo.set:todo-1");
    expect(actionKey(queued[1])).toBe("job.save:job-1");
  });

  it("replays queued actions in order and clears them", async () => {
    enqueueTodoSet(todo(), true);
    enqueueJobSave("job-1", "Backend engineer", true);

    const result = await flushOfflineQueue();

    expect(result).toEqual({ sent: 2, dropped: 0 });
    expect(patch).toHaveBeenCalledTimes(1);
    expect(post).toHaveBeenCalledTimes(1);
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]")).toEqual([]);
  });

  it("keeps actions when the server is unreachable", async () => {
    enqueueTodoSet(todo(), true);
    patch.mockRejectedValue({ status: 0 });

    const result = await flushOfflineQueue();

    expect(result).toEqual({ sent: 0, dropped: 0 });
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]")).toHaveLength(1);
  });

  it("drops an action the server refuses rather than retrying forever", async () => {
    enqueueTodoSet(todo(), true);
    patch.mockRejectedValue({ status: 409 });

    const result = await flushOfflineQueue();

    expect(result).toEqual({ sent: 0, dropped: 1 });
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]")).toEqual([]);
  });

  it("does nothing while offline", async () => {
    enqueueTodoSet(todo(), true);
    Object.defineProperty(navigator, "onLine", { value: false, configurable: true });

    const result = await flushOfflineQueue();

    expect(result).toEqual({ sent: 0, dropped: 0 });
    expect(patch).not.toHaveBeenCalled();
  });

  it("caps the queue so a long outage cannot grow without bound", () => {
    for (let index = 0; index < 40; index += 1) {
      enqueue({
        id: `id-${index}`,
        kind: "job.save",
        label: `Job ${index}`,
        createdAt: new Date().toISOString(),
        payload: { jobId: `job-${index}`, saved: true },
      });
    }

    const queued = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]");
    expect(queued).toHaveLength(25);
    expect(queued.at(-1).payload.jobId).toBe("job-39");
  });
});
