import { describe, expect, it } from "vitest";
import { freshApp } from "./helpers";

/** Reads SSE frames until `count` state-changed events arrive. */
async function readStateChanges(body: ReadableStream<Uint8Array>, count: number, onFirst?: () => unknown) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  const versions: number[] = [];
  let buf = "";
  while (versions.length < count) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const frames = buf.split("\n\n");
    buf = frames.pop()!;
    for (const f of frames) {
      if (!f.includes("event: state-changed")) continue;
      versions.push(JSON.parse(/data: (.*)/.exec(f)![1]).version);
      if (versions.length === 1) await onFirst?.();
    }
  }
  await reader.cancel();
  return versions;
}

describe("B2: SSE stream", () => {
  it("sends the current version on connect", async () => {
    const { app } = freshApp();
    const res = await app.request("/api/stream");
    expect(res.headers.get("content-type")).toMatch(/text\/event-stream/);
    expect(await readStateChanges(res.body!, 1)).toEqual([0]);
  });

  it("emits state-changed on the presenter's Acknowledge and on reset", async () => {
    const { app, post } = freshApp();
    const res = await app.request("/api/stream");
    const versions = await readStateChanges(res.body!, 3, async () => {
      await post(`/api/alerts/${encodeURIComponent("protocol_mismatch:26H1004/A1")}/acknowledge`);
      await post("/api/sim/reset");
    });
    expect(versions).toEqual([0, 1, 2]);
  });
});
