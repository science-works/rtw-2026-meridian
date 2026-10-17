// Master prompt v8: the recorded incident is part of the 11:30 data. The demo controls are
// the presenter's Acknowledge and Reset demo; there is nothing to replay.
import { describe, expect, it } from "vitest";
import { parseSimTime } from "../../shared/clock";
import type { Alert, CaseDetail, Overview } from "../../shared/types";
import { freshApp } from "./helpers";

const ID = encodeURIComponent("protocol_mismatch:26H1004/A1");

describe("B3 (v8): the recorded H&E incident at 11:30", () => {
  it("is present from the start: 20 slides across 10 cases; replay endpoints return 409", async () => {
    const { get, post } = freshApp();
    const basket = (await get<Alert[]>("/api/alerts")).body.find((a) => a.kind === "basket_failure")!;
    expect(basket.slideIds).toHaveLength(20);
    expect(basket.caseIds).toHaveLength(10);
    expect((await post("/api/sim/replay-incident")).status).toBe(409);
    expect((await post("/api/sim/basket-failure")).status).toBe(409);
  });

  it("each affected case timeline is in time order and carries the incident", async () => {
    const { get } = freshApp();
    for (let i = 5; i <= 14; i++) {
      const c = (await get<CaseDetail>(`/api/cases/26H10${String(i).padStart(2, "0")}`)).body;
      expect(c.alertIds).toContain("basket_failure:H&E-BASKET-01");
      expect(c.timeline.map((e) => parseSimTime(e.at))).toEqual([...c.timeline.map((e) => parseSimTime(e.at))].sort((a, b) => a - b));
    }
    expect((await get<CaseDetail>("/api/cases/26H1005")).body.timeline.map((e) => e.eventId)).toContain("EV-01215");
  });

  it("affected estimates include the 30-minute repeat from 11:05 (Day 1 11:45)", async () => {
    const { get } = freshApp();
    const e = (await get<CaseDetail>("/api/cases/26H1005")).body.estimate;
    expect(e.readyAt).toBe("Day 1 11:45");
    expect(e.components.map((c) => c.step)).toContain("Repeat H&E run (started 11:05)");
  });

  it("only the demo routes mutate state", async () => {
    const { app } = freshApp();
    for (const path of ["/api/cases/26H1005", "/api/alerts", "/api/overview"]) {
      expect((await app.request(path, { method: "POST" })).status).toBe(404);
      expect((await app.request(path, { method: "DELETE" })).status).toBe(404);
    }
  });
});

describe("B4 (v8): Reset demo restores the 11:30 state, 3 times in a row", () => {
  it("acknowledge → reset → identical start state each time", async () => {
    const { get, post } = freshApp();
    const initial = (await get<Alert[]>("/api/alerts")).body;
    for (let run = 1; run <= 3; run++) {
      expect((await post(`/api/alerts/${ID}/acknowledge`)).status).toBe(200);
      expect((await get<Alert[]>("/api/alerts")).body.find((a) => a.kind === "protocol_mismatch")!.state).toBe("acknowledged");
      expect((await post("/api/sim/reset")).status).toBe(200);
      expect((await get<Alert[]>("/api/alerts")).body).toEqual(initial);
      expect((await get<Overview>("/api/overview")).body.openAttention).toBe(4);
    }
  });
});
