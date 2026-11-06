import { describe, expect, it } from "vitest";
import { parseTaskEvent, takeSseEvents, type TaskEvent } from "./stream";

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
