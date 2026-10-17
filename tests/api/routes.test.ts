import { describe, expect, it } from "vitest";
import { findOverclaims } from "../../server/src/domain/wording";
import type { Alert, CaseDetail, CaseSummary, DelayedResponse, Overview } from "../../shared/types";
import { freshApp } from "./helpers";

describe("B1: read API over the in-memory state", () => {
  it("GET /api/health reports simulated data", async () => {
    const { get } = freshApp();
    expect((await get("/api/health")).body).toMatchObject({ ok: true, simulated: true, clock: "Day 1 11:30" });
  });

  it("GET /api/overview reconciles to 450 = 104 + 346 with 8 ready", async () => {
    const { body } = await freshApp().get<Overview>("/api/overview");
    expect(body).toMatchObject({ clock: "Day 1 11:30", total: 450, backlog: 104, today: 346, ready: 8, triggerFired: false });
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

  it("derives each block's stage: 26H1003 A1-E1 in processing, F1 at cut-up", async () => {
    const { get } = freshApp();
    const c = (await get<CaseDetail>("/api/cases/26H1003")).body;
    const stageOf = Object.fromEntries(c.blocks.map((b) => [b.blockId, b.stage]));
    for (const id of ["A1", "B1", "C1", "D1", "E1"]) expect(stageOf[id]).toBe("Awaiting processor or processing");
    expect(stageOf.F1).toBe("Waiting for dissection/cut-up");
    const ready = (await get<CaseDetail>("/api/cases/26H1018")).body;
    expect(ready.blocks.map((b) => b.stage)).toEqual(["Ready for pathologist handoff"]);
    const queue = (await get<CaseDetail>("/api/cases/26H1020")).body;
    expect(new Set(queue.blocks.map((b) => b.stage))).toEqual(new Set(["Waiting for dissection/cut-up"]));
  });

  it("GET /api/stations returns the lab-flow map; /api/stations/:id one card; unknown → 404", async () => {
    const { get } = freshApp();
    const all = (await get<{ id: string }[]>("/api/stations")).body;
    expect(all.map((c) => c.id)).toContain("processor-d");
    const d = (await get<{ items: string[] }>("/api/stations/processor-d")).body;
    expect(d.items).toEqual(["26H1003 · A1–E1"]);
    expect((await get("/api/stations/nope")).status).toBe(404);
  });

  it("case detail says why the case is waiting", async () => {
    const { get } = freshApp();
    const c = (await get<CaseDetail>("/api/cases/26H1004")).body;
    expect(c.waiting.missing).toMatch(/Levels 2–3 not recorded/);
    expect(c.waiting.latest?.at).toBe("Day 1 11:30");
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

  it("serves computed estimates: ready, estimated and explicit unknowns", async () => {
    const { get } = freshApp();
    const est = async (id: string) => (await get<CaseDetail>(`/api/cases/${id}`)).body.estimate;
    expect(await est("26H1018")).toMatchObject({ status: "ready", readyAt: "Day 1 11:15" });
    expect(await est("26H1001")).toMatchObject({ status: "estimated", readyAt: "Day 1 12:28" });
    expect(await est("26H2345")).toMatchObject({ status: "ready", readyAt: "Day 1 09:30" });
    expect((await est("26H1016")).status).toBe("unknown");
    expect((await est("26H1003")).reasonUnknown).toMatch(/F1/);
  });

  it("GET /api/delayed compares against configured targets only", async () => {
    const { get } = freshApp({ urgent: null, screening: null, routine: 8 });
    const { body } = await get<DelayedResponse>("/api/delayed");
    expect(body.note).toBe("target comparison unavailable for: urgent, screening");
    const ids = body.cases.map((c) => c.caseId);
    expect(ids).toEqual(expect.arrayContaining(["26H1003", "26H1004", "26H1015", "26H1018"]));
    for (const c of body.cases) {
      if (c.alertIds.length) continue;
      expect(c.estimate.target).toMatchObject({ late: true, label: "Routine: 8 working hours" });
    }
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
      expect(s).not.toMatch(/Prisma|Pegasus|Logos|Stainer 1|Microtome |IQC desk/);
      expect(findOverclaims(s)).toEqual([]);
    }
  });
});
