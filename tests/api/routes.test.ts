import { describe, expect, it } from "vitest";
import { findOverclaims } from "../../server/src/domain/wording";
import type { Alert, CaseDetail, CaseSummary, DelayedResponse, Overview } from "../../shared/types";
import { freshApp } from "./helpers";

describe("B1: read API over the in-memory state", () => {
  it("GET /api/health reports simulated data", async () => {
    const { get } = freshApp();
    expect((await get("/api/health")).body).toMatchObject({ ok: true, simulated: true, clock: "Day 1 11:30" });
  });

  it("GET /api/overview reconciles to 450 = 104 + 346 with 7 ready", async () => {
    const { body } = await freshApp().get<Overview>("/api/overview");
    expect(body).toMatchObject({ clock: "Day 1 11:30", total: 450, backlog: 104, today: 346, ready: 7, triggerFired: false });
    expect(body.stages).toHaveLength(10);
    expect(body.stages.reduce((n, s) => n + s.total, 0)).toBe(450);
  });

  it("GET /api/alerts returns the three pre-trigger alerts", async () => {
    const { body } = await freshApp().get<Alert[]>("/api/alerts");
    expect(body.map((a) => a.kind).sort()).toEqual(["outstanding_block", "protocol_mismatch", "scan_gap"]);
  });

  it("GET /api/cases lists 450 summaries carrying their alert IDs", async () => {
    const { body } = await freshApp().get<CaseSummary[]>("/api/cases");
    expect(body).toHaveLength(450);
    expect(body.find((c) => c.caseId === "26H1003")!.alertIds).toEqual(["outstanding_block:26H1003"]);
    expect(body.find((c) => c.caseId === "26H2345")!.alertIds).toEqual([]);
  });

  it("GET /api/cases filters by stage, priority, programme and demo", async () => {
    const { get } = freshApp();
    expect((await get<CaseSummary[]>("/api/cases?stage=Microtomy")).body).toHaveLength(139);
    expect((await get<CaseSummary[]>("/api/cases?priority=Urgent")).body).toHaveLength(15);
    expect((await get<CaseSummary[]>("/api/cases?programme=BCSP")).body).toHaveLength(11);
    expect((await get<CaseSummary[]>("/api/cases?programme=any")).body).toHaveLength(143);
    expect((await get<CaseSummary[]>("/api/cases?demo=true")).body).toHaveLength(22);
  });

  it("GET /api/cases/:id returns blocks, slides and the recorded timeline", async () => {
    const { get } = freshApp();
    const { body } = await get<CaseDetail>("/api/cases/26H1003");
    expect(body.blocks.map((b) => b.blockId)).toEqual(["A1", "B1", "C1", "D1", "E1", "F1"]);
    expect(body.alertIds).toEqual(["outstanding_block:26H1003"]);
    expect(body.timeline.at(-1)!.eventId).toBe("EV-01214");
    const basket = (await get<CaseDetail>("/api/cases/26H1005")).body;
    expect(basket.timeline.map((e) => e.eventId)).not.toContain("EV-01215"); // still staged
    expect(basket.slides).toHaveLength(2);
  });

  it("GET /api/cases/:id is case-insensitive and 404s unknown IDs", async () => {
    const { get } = freshApp();
    expect((await get<CaseDetail>("/api/cases/26h1004")).body.caseId).toBe("26H1004");
    const missing = await get<{ error: string }>("/api/cases/26H9999");
    expect(missing.status).toBe(404);
    expect(missing.body.error).toMatch(/26H9999/);
  });

  it("GET /api/delayed returns the holds and says target comparison unavailable", async () => {
    const { get } = freshApp();
    const { body } = await get<DelayedResponse>("/api/delayed");
    expect(body.note).toBe("target comparison unavailable");
    expect(body.cases.map((c) => c.caseId).sort()).toEqual(["26H1003", "26H1004", "26H1015"]);
    const screening = (await get<DelayedResponse>("/api/delayed?programme=any")).body;
    expect(screening.cases).toEqual([]);
    expect(screening.note).toBe("target comparison unavailable");
  });

  it("never exposes workbook equipment names or overclaims in any response", async () => {
    const { get } = freshApp();
    const ids = (await get<CaseSummary[]>("/api/cases")).body.map((c) => c.caseId);
    const bodies = [
      await get("/api/overview"),
      await get("/api/alerts"),
      await get("/api/cases"),
      await get("/api/delayed"),
      ...(await Promise.all(ids.map((id) => get(`/api/cases/${id}`)))),
    ].map((r) => JSON.stringify(r.body));
    for (const s of bodies) {
      expect(s).not.toMatch(/Prisma|Pegasus|Logos/);
      expect(findOverclaims(s)).toEqual([]);
    }
  });
});
