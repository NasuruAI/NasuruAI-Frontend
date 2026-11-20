import { describe, expect, it } from "vitest";
import {
  isNewTaskFrame,
  parseTaskEvent,
  takeSseEvents,
  taskFrameSignature,
  type TaskEvent,
} from "./stream";

describe("takeSseEvents", () => {
  it("splits complete frames off a partial tail", () => {
    const buffer = [
      'event: task\nid: 11111111-1111-1111-1111-111111111111\ndata: {"state":"queued"}\n\n',
      'event: task\nid: 11111111-1111-1111-1111-111111111111\ndata: {"state":"running"}\n\n',
      'event: task\nid: 11111111-1111-1111-1111-111111111111\ndata: {"state":"succeeded"}\n\n',
      "event: task\nid: 11111111-1111-1111-1111-111111111111",
    ].join("");

    const { frames, rest } = takeSseEvents(buffer);

    expect(frames).toEqual([
      'event: task\nid: 11111111-1111-1111-1111-111111111111\ndata: {"state":"queued"}',
      'event: task\nid: 11111111-1111-1111-1111-111111111111\ndata: {"state":"running"}',
      'event: task\nid: 11111111-1111-1111-1111-111111111111\ndata: {"state":"succeeded"}',
    ]);
    expect(rest).toBe("event: task\nid: 11111111-1111-1111-1111-111111111111");
  });

  it("parses the task payload of one frame into an event", () => {
    const event: TaskEvent = parseTaskEvent(
      'event: task\nid: abc\ndata: {"state":"succeeded","progress":{"done":2}}\n',
    );
    expect(event.state).toBe("succeeded");
    expect(event.progress).toEqual({ done: 2 });
  });

  it("returns no frames and keeps the partial tail for a frame that is still arriving", () => {
    const { frames, rest } = takeSseEvents("event: task\nid: ab");
    expect(frames).toEqual([]);
    expect(rest).toBe("event: task\nid: ab");
  });

  it("ignores empty frames", () => {
    const { frames, rest } = takeSseEvents("\n\n");
    expect(frames).toEqual([]);
    expect(rest).toBe("");
  });
});

describe("isNewTaskFrame", () => {
  const id = "11111111-1111-1111-1111-111111111111";

  it("is news the first time (no previous frame)", () => {
    const event: TaskEvent = { state: "running", progress: { stage: "reading_form" } };
    expect(isNewTaskFrame("", id, event)).toBe(true);
  });

  it("treats an identical repeat as a heartbeat, not news", () => {
    const event: TaskEvent = { state: "running", progress: { stage: "answering" } };
    const previous = taskFrameSignature(id, event);
    expect(isNewTaskFrame(previous, id, event)).toBe(false);
  });

  it("is news when the state or progress moves", () => {
    const before: TaskEvent = { state: "running", progress: { stage: "reading_form" } };
    const previous = taskFrameSignature(id, before);
    const advanced: TaskEvent = { state: "running", progress: { stage: "answering" } };
    const finished: TaskEvent = { state: "succeeded", result: { ok: true } };
    expect(isNewTaskFrame(previous, id, advanced)).toBe(true);
    expect(isNewTaskFrame(previous, id, finished)).toBe(true);
  });

  it("is news when it is a different task, even with the same payload", () => {
    const event: TaskEvent = { state: "running", progress: { stage: "answering" } };
    const previous = taskFrameSignature(id, event);
    expect(isNewTaskFrame(previous, "22222222-2222-2222-2222-222222222222", event)).toBe(true);
  });

  it("never counts the reader's own unavailable frame as progress", () => {
    expect(isNewTaskFrame("", id, { state: "unavailable" })).toBe(false);
  });
});
