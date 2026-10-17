// Master prompt v8: the incident state at 11:30 after Reset demo (nothing held back).
import { describe, expect, it } from "vitest";
import { createApp } from "../../server/src/app";
import { loadData } from "../../server/src/domain/load";
import { createState } from "../../server/src/state";
import type { Alert, EventsPage, Overview } from "../../shared/types";

const setup = () => {
  const state = createState(loadData(), { urgent: null, screening: null, routine: null });
  const app = createApp(state);
  const get = async <T,>(p: string) => (await (await app.request(p)).json()) as T;
  const post = async <T,>(p: string) => {
    const r = await app.request(p, { method: "POST" });
    return { status: r.status, body: (await r.json()) as T };
  };
  return { state, get, post };
};
const byKind = (alerts: Alert[]) => Object.fromEntries(alerts.map((a) => [a.kind, a]));
const ID = (id: string) => encodeURIComponent(id);

describe("state at 11:30", () => {
  it("loads the full workbook: all 1,253 events, nothing staged", async () => {
    const { get } = setup();
    expect((await get<EventsPage>("/api/events")).total).toBe(1253);
  });

  it("stainer: recorded steps through repeat 11:05; troubleshooting / resolving, re-staining ETA completion 11:35; not new", async () => {
    const { get } = setup();
    const a = byKind(await get<Alert[]>("/api/alerts")).basket_failure;
    expect(a.state).toBe("in_progress");
    expect(a.stateDetail).toBe("Troubleshooting / resolving — re-staining, ETA completion 11:35");
    expect(a.history.map((h) => h.at.slice(-5))).toEqual(["10:45", "10:46", "10:47", "10:50", "11:04", "11:05"]);
  });

  it("26H1004 is the only New incident; 26H1003 and 26H1015 are Check needed", async () => {
    const { get } = setup();
    const k = byKind(await get<Alert[]>("/api/alerts"));
    expect(k.protocol_mismatch.state).toBe("new");
    expect(k.outstanding_block.state).toBe("check_needed");
    expect(k.scan_gap.state).toBe("check_needed");
    expect((await get<Alert[]>("/api/alerts")).filter((a) => a.state === "new").map((a) => a.caseIds[0])).toEqual(["26H1004"]);
  });

  it("overview: 4 open incidents, 8 of 450 completed", async () => {
    const { get } = setup();
    expect(await get<Overview>("/api/overview")).toMatchObject({ total: 450, today: 346, backlog: 104, ready: 8, openAttention: 4 });
  });

  it("there is nothing to replay: the incident is already recorded (409)", async () => {
    const { post } = setup();
    expect((await post<{ error: string }>("/api/sim/replay-incident")).status).toBe(409);
    expect((await post<{ error: string }>("/api/sim/basket-failure")).status).toBe(409);
  });
});

describe("presenter acknowledge", () => {
  it("26H1004 → Acknowledged, awaiting check; still open; labelled as a session action, not a lab event", async () => {
    const { get, post, state } = setup();
    const before = state.data.events.length;
    const r = await post(`/api/alerts/${ID("protocol_mismatch:26H1004/A1")}/acknowledge`);
    expect(r.status).toBe(200);
    const a = byKind(await get<Alert[]>("/api/alerts")).protocol_mismatch;
    expect(a.state).toBe("acknowledged");
    expect(a.stateDetail).toBe("Acknowledged — awaiting check");
    expect(a.history.at(-1)!.label).toMatch(/presenter.*not a lab event/i);
    expect(state.data.events.length).toBe(before); // no event invented
    expect((await get<Overview>("/api/overview")).openAttention).toBe(4);
    expect((await post(`/api/alerts/${ID("protocol_mismatch:26H1004/A1")}/acknowledge`)).status).toBe(409);
  });

  it("the stainer incident is already acknowledged in the record (409); unknown alert → 404", async () => {
    const { post } = setup();
    expect((await post(`/api/alerts/${ID("basket_failure:H&E-BASKET-01")}/acknowledge`)).status).toBe(409);
    expect((await post(`/api/alerts/nope/acknowledge`)).status).toBe(404);
  });

  it("Check-needed incidents can be acknowledged too (awaiting check)", async () => {
    const { get, post } = setup();
    expect((await post(`/api/alerts/${ID("scan_gap:26H1015")}/acknowledge`)).status).toBe(200);
    expect(byKind(await get<Alert[]>("/api/alerts")).scan_gap.state).toBe("acknowledged");
  });

  it("Reset demo restores the 11:30 state and clears the agent console", async () => {
    const { get, post } = setup();
    await post(`/api/alerts/${ID("protocol_mismatch:26H1004/A1")}/acknowledge`);
    await post("/api/sim/reset");
    expect(byKind(await get<Alert[]>("/api/alerts")).protocol_mismatch.state).toBe("new");
    expect(await get<unknown[]>("/api/agent/activity")).toEqual([]);
  });
});
