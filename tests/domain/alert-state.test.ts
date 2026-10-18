// Spec §6: New → Acknowledged → In progress → Resolved, derived only from recorded events.
import { beforeAll, describe, expect, it } from "vitest";
import { computeAlerts } from "../../server/src/domain/alerts";
import { splitStaged } from "../../server/src/domain/incident";
import { loadData } from "../../server/src/domain/load";
import type { Alert, CellpathData, EventRecord } from "../../shared/types";

let log: CellpathData;
let staged: EventRecord[];
const upTo = (lastId: string): CellpathData => {
  const i = staged.findIndex((e) => e.eventId === lastId);
  return { ...log, events: [...log.events, ...staged.slice(0, i + 1)] };
};
const basket = (d: CellpathData) => computeAlerts(d).find((a) => a.kind === "basket_failure")!;

beforeAll(() => {
  ({ data: log, staged } = splitStaged(loadData()));
});

describe("alert states from recorded events", () => {
  it("has no severity ranking field at all", () => {
    for (const a of computeAlerts(loadData())) expect(a).not.toHaveProperty("severity");
  });

  it("26H1004 (levels mismatch) is New; 26H1003 and 26H1015 are Check needed", () => {
    expect(Object.fromEntries(computeAlerts(log).map((a) => [a.kind, a.state]))).toEqual({ protocol_mismatch: "new", outstanding_block: "check_needed", scan_gap: "check_needed" });
  });

  it("failure (+ team notified) → New", () => {
    const a = basket(upTo("EV-01250"));
    expect(a.state).toBe("new");
    expect(a.history.map((h) => h.eventId)).toEqual(["EV-01215", "EV-01250"]);
  });

  it("acknowledged at 10:47 → Acknowledged (motion stops, card stays)", () => {
    expect(basket(upTo("EV-01255")).state).toBe("acknowledged");
  });

  it("troubleshooting, reload and repeat run → In progress, showing the latest recorded staff action", () => {
    const t = basket(upTo("EV-01251"));
    expect(t.state).toBe("in_progress");
    expect(t.stateDetail).toMatch(/troubleshooting/i);
    const r = basket(upTo("EV-01256"));
    expect(r.state).toBe("in_progress");
    expect(r.stateDetail).toBe("Troubleshooting / resolving — re-staining · Stain run completes ~11:35");
  });

  it("is never Resolved at 11:30: no completion or check event exists", () => {
    const full = basket(loadData());
    expect(full.state).toBe("in_progress");
    expect(full.history.map((h) => [h.at, h.label])).toEqual([
      ["Day 1 10:45", "Run failed"],
      ["Day 1 10:46", "Team notified"],
      ["Day 1 10:47", "Acknowledged"],
      ["Day 1 10:50", "Troubleshooting started"],
      ["Day 1 11:04", "Basket reloaded"],
      ["Day 1 11:05", "Repeat H&E run started"],
    ]);
  });

  it("would be Resolved only with a recorded completion after the repeat run", () => {
    const full = loadData();
    const done: EventRecord = { ...staged.find((e) => e.eventId === "EV-01256")!, eventId: "EV-TEST", at: "Day 1 11:35", type: "STAINING_COMPLETE", details: "Repeat run complete for H&E-BASKET-01.", activation: "Recorded" };
    const a: Alert = basket({ ...full, events: [...full.events, done] });
    expect(a.state).toBe("resolved");
  });
});

describe("overview headline counts (spec Screen A)", () => {
  it("are computed from data", { timeout: 30_000 }, async () => {
    const { freshApp } = await import("../api/helpers");
    const { get, post } = freshApp();
    const o = (await get<Record<string, number>>("/api/overview")).body;
    expect(o).toMatchObject({ total: 450, backlog: 104, today: 346, urgent: 15, screeningLinked: 143, ready: 8, openAttention: 4 });
    await post(`/api/alerts/${encodeURIComponent("protocol_mismatch:26H1004/A1")}/acknowledge`);
    expect((await get<Record<string, number>>("/api/overview")).body.openAttention).toBe(4); // acknowledged is still open
  });
});

describe("where each incident is (incidents page)", () => {
  it("names the station, basket or area from the recorded events", () => {
    const where = Object.fromEntries(computeAlerts(loadData()).map((a) => [a.kind, a.where]));
    expect(where).toEqual({
      basket_failure: "H&E auto-stainer 1 · Box 1 / Basket 1 · H&E-BASKET-01",
      protocol_mismatch: "Microtomy station 4",
      outstanding_block: "Processor D (A1–E1) · Pathologist dissection / cut-up area (F1)",
      scan_gap: "Scanner queue",
    });
  });
});
