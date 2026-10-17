// Playbook 07 decision 3: replay + the presenter's Acknowledge, step by step.
import { describe, expect, it } from "vitest";
import { createApp } from "../../server/src/app";
import { loadData } from "../../server/src/domain/load";
import { createState } from "../../server/src/state";
import type { Alert, Overview } from "../../shared/types";

const NO_TARGETS = { urgent: null, screening: null, routine: null };
const ID = encodeURIComponent("basket_failure:H&E-BASKET-01");
const tick = (ms = 20) => new Promise((r) => setTimeout(r, ms));

function app() {
  const state = createState(loadData(), NO_TARGETS, "workbook", { stepMs: 0 });
  const a = createApp(state);
  const json = async <T,>(path: string, method = "GET") => {
    const r = await a.request(path, { method });
    return { status: r.status, body: (await r.json()) as T };
  };
  return { state, json };
}

describe("replay-incident and acknowledge", () => {
  it("replay appends the failure and team-notified only: one New incident that arrived live", async () => {
    const { json } = app();
    const r = await json<{ fired: boolean; affectedCases: number; affectedSlides: number }>("/api/sim/replay-incident", "POST");
    expect(r).toEqual({ status: 200, body: { fired: true, affectedCases: 10, affectedSlides: 20 } });
    const a = (await json<Alert>(`/api/alerts/${ID}`)).body;
    expect(a.state).toBe("new");
    expect(a.arrivedLive).toBe(true);
    expect(a.history.map((h) => h.eventId)).toEqual(["EV-01215", "EV-01250"]);
    expect((await json("/api/sim/replay-incident", "POST")).status).toBe(409);
  });

  it("the three pre-existing alerts did not arrive live (static marker, no bounce)", async () => {
    const { json } = app();
    await json("/api/sim/replay-incident", "POST");
    const all = (await json<Alert[]>("/api/alerts")).body;
    expect(all.filter((a) => a.arrivedLive).map((a) => a.id)).toEqual(["basket_failure:H&E-BASKET-01"]);
  });

  it("acknowledge records 10:47 (+ troubleshooting 10:50), then reload 11:04 and repeat 11:05 follow; never resolved", async () => {
    const { json, state } = app();
    await json("/api/sim/replay-incident", "POST");
    const ack = await json<{ acknowledged: boolean }>(`/api/alerts/${ID}/acknowledge`, "POST");
    expect(ack.status).toBe(200);
    const right = (await json<Alert>(`/api/alerts/${ID}`)).body;
    expect(["acknowledged", "in_progress"]).toContain(right.state);
    expect(right.history.map((h) => h.label)).toContain("Acknowledged");
    await tick();
    const later = (await json<Alert>(`/api/alerts/${ID}`)).body;
    expect(later.state).toBe("in_progress");
    expect(later.stateDetail).toBe("Repeat H&E run started 11:05");
    expect(state.data.events.length).toBe(1253); // the whole workbook, nothing invented
    expect((await json(`/api/alerts/${ID}/acknowledge`, "POST")).status).toBe(409);
  });

  it("acknowledge before replay, or on an alert with no recorded acknowledgement, is refused", async () => {
    const { json } = app();
    expect((await json(`/api/alerts/${ID}/acknowledge`, "POST")).status).toBe(404);
    const r = await json<{ error: string }>(`/api/alerts/${encodeURIComponent("protocol_mismatch:26H1004/A1")}/acknowledge`, "POST");
    expect(r.status).toBe(409);
    expect(r.body.error).toMatch(/no acknowledgement is recorded/i);
  });

  it("reset restores the staged state and cancels pending steps", async () => {
    const { json } = app();
    await json("/api/sim/replay-incident", "POST");
    await json(`/api/alerts/${ID}/acknowledge`, "POST");
    await json("/api/sim/reset", "POST");
    await tick();
    expect((await json<Alert[]>("/api/alerts")).body.map((a) => a.kind)).not.toContain("basket_failure");
    expect((await json<Overview>("/api/overview")).body.triggerFired).toBe(false);
    expect((await json("/api/sim/replay-incident", "POST")).status).toBe(200);
  });

  it("the MCP server cannot replay, acknowledge or reset", async () => {
    const { readFileSync } = await import("node:fs");
    const src = readFileSync("mcp/src/server.ts", "utf8");
    expect(src).not.toMatch(/replay-incident|acknowledge"|\/api\/sim|method: "POST"/);
  });
});
