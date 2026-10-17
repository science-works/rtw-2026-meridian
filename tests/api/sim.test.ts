import { describe, expect, it } from "vitest";
import type { Alert, CaseDetail, Overview } from "../../shared/types";
import { freshApp } from "./helpers";

describe("B3: basket-failure trigger", () => {
  it("fires once: 20 slides, 10 cases; a second call returns 409", async () => {
    const { get, post } = freshApp();
    const first = await post("/api/sim/basket-failure");
    expect(first.status).toBe(200);
    expect(first.body).toEqual({ fired: true, affectedCases: 10, affectedSlides: 20 });
    const second = await post<{ error: string }>("/api/sim/basket-failure");
    expect(second.status).toBe(409);
    expect(second.body.error).toMatch(/already/i);
    const alerts = (await get<Alert[]>("/api/alerts")).body;
    expect(alerts.filter((a) => a.kind === "basket_failure")).toHaveLength(1);
  });

  it("appends exactly one event to each affected case's timeline and flags it", async () => {
    const { get, post } = freshApp();
    await post("/api/sim/basket-failure");
    const c = (await get<CaseDetail>("/api/cases/26H1005")).body;
    expect(c.timeline.filter((e) => e.eventId === "EV-01215")).toHaveLength(1);
    expect(c.timeline.at(-1)!.details).not.toMatch(/PENDING|pitch/i);
    expect(c.alertIds).toEqual(["basket_failure:EV-01215"]);
    for (let i = 5; i <= 14; i++) {
      const id = `26H10${String(i).padStart(2, "0")}`;
      expect((await get<CaseDetail>(`/api/cases/${id}`)).body.alertIds).toContain("basket_failure:EV-01215");
    }
    expect((await get<CaseDetail>("/api/cases/26H1015")).body.alertIds).not.toContain("basket_failure:EV-01215");
  });

  it("marks the overview as fired without changing stage counts", async () => {
    const { get, post } = freshApp();
    const before = (await get<Overview>("/api/overview")).body;
    await post("/api/sim/basket-failure");
    const after = (await get<Overview>("/api/overview")).body;
    expect(after.triggerFired).toBe(true);
    expect(after.stages).toEqual(before.stages);
  });

  it("only the simulator routes mutate state", async () => {
    const { app } = freshApp();
    for (const path of ["/api/cases/26H1005", "/api/alerts", "/api/overview"]) {
      expect((await app.request(path, { method: "POST" })).status).toBe(404);
      expect((await app.request(path, { method: "DELETE" })).status).toBe(404);
    }
    expect((await app.request("/api/sim/basket-failure")).status).toBe(404); // GET does nothing
  });
});

describe("B4: reset", () => {
  it("restores the initial state so the trigger works again, 3 times in a row", async () => {
    const { get, post } = freshApp();
    const initialAlerts = (await get<Alert[]>("/api/alerts")).body;
    for (let run = 1; run <= 3; run++) {
      const fired = await post("/api/sim/basket-failure");
      expect(fired.status).toBe(200);
      expect(fired.body).toEqual({ fired: true, affectedCases: 10, affectedSlides: 20 });
      expect((await post("/api/sim/basket-failure")).status).toBe(409);
      expect((await post("/api/sim/reset")).status).toBe(200);
      expect((await get<Overview>("/api/overview")).body.triggerFired).toBe(false);
      expect((await get<Alert[]>("/api/alerts")).body).toEqual(initialAlerts);
      const c = (await get<CaseDetail>("/api/cases/26H1005")).body;
      expect(c.timeline.map((e) => e.eventId)).not.toContain("EV-01215");
    }
  });
});
