import { describe, expect, it } from "vitest";
import { createApp } from "../../server/src/app";
import type { CaseDetail, CaseSummary, DelayedResponse, Overview } from "../../shared/types";

const app = createApp();
const get = (path: string) => app.request(path);

describe("API contract stub (T0)", () => {
  it("GET /api/health reports simulated data", async () => {
    const res = await get("/api/health");
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, simulated: true });
  });

  it("GET /api/overview reconciles to 450 = 104 + 346", async () => {
    const o = (await (await get("/api/overview")).json()) as Overview;
    expect(o).toMatchObject({ clock: "Day 1 11:30", total: 450, backlog: 104, today: 346, ready: 7, triggerFired: false });
    expect(o.stages.reduce((n, s) => n + s.total, 0)).toBe(450);
  });

  it("GET /api/cases lists all 450 and filters by stage", async () => {
    const all = (await (await get("/api/cases")).json()) as CaseSummary[];
    expect(all).toHaveLength(450);
    const micro = (await (await get("/api/cases?stage=Microtomy")).json()) as CaseSummary[];
    expect(micro).toHaveLength(139);
  });

  it("does not invent estimates before the estimate engine exists", async () => {
    const all = (await (await get("/api/cases")).json()) as CaseSummary[];
    expect(all.every((c) => c.estimate.status === "unknown" && c.estimate.reasonUnknown)).toBe(true);
  });

  it("GET /api/cases/:id returns detail, or 404 with an error", async () => {
    const c = (await (await get("/api/cases/26H1003")).json()) as CaseDetail;
    expect(c.caseId).toBe("26H1003");
    expect(c.blocks.map((b) => b.blockId)).toEqual(["A1", "B1", "C1", "D1", "E1", "F1"]);
    expect(c.timeline.length).toBeGreaterThan(0);
    const missing = await get("/api/cases/26H9999");
    expect(missing.status).toBe(404);
    expect(await missing.json()).toHaveProperty("error");
  });

  it("GET /api/alerts and /api/delayed return contract shapes", async () => {
    expect(Array.isArray(await (await get("/api/alerts")).json())).toBe(true);
    const d = (await (await get("/api/delayed")).json()) as DelayedResponse;
    expect(d.note).toBe("target comparison unavailable");
  });

  it("the simulator routes are not active yet", async () => {
    expect((await app.request("/api/sim/basket-failure", { method: "POST" })).status).toBe(501);
    expect((await app.request("/api/sim/reset", { method: "POST" })).status).toBe(501);
  });
});
