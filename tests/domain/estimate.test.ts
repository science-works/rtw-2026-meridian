// Expected times are worked out by hand from the v7 workbook's Timing Rules:
// staffed 07:00-17:00; Processor A/B out 06:45, C 08:40, D 12:00-13:00 (13:00 used);
// embedding 2-4 h (4 h used); microtomy 4 min/block + 2 min/extra level; H&E run 30 min;
// repeat stain 30 min (recorded start 11:05); scan 2 min/slide (any hour); IQC 1 min/slide;
// completion 2; physical 1; digital 1.
import { beforeAll, describe, expect, it } from "vitest";
import { loadData } from "../../server/src/domain/load";
import { computeAlerts } from "../../server/src/domain/alerts";
import { estimateAll, type EstimateContext } from "../../server/src/domain/estimate";
import { parseRules } from "../../server/src/domain/rules";
import { fireBasketFailure } from "../../server/src/domain/trigger";
import { splitStaged } from "../../server/src/domain/incident";
import { findOverclaims } from "../../server/src/domain/wording";
import { parseSimTime } from "../../shared/clock";
import type { CellpathData, Estimate } from "../../shared/types";
import type { Targets } from "../../server/src/targets";

const NO_TARGETS: Targets = { urgent: null, screening: null, routine: null };
let data: CellpathData;
let before: Map<string, Estimate>;
let after: Map<string, Estimate>;
const ctx = (d: CellpathData, targets = NO_TARGETS): EstimateContext => ({ data: d, alerts: computeAlerts(d), targets });

beforeAll(() => {
  const split = splitStaged(loadData());
  data = split.data;
  before = estimateAll(ctx(data));
  after = estimateAll(ctx(fireBasketFailure(data, split.staged)));
});

describe("timing rules come from the workbook, not from code", () => {
  it("parses the configured durations and output times", () => {
    const r = parseRules(data.timingRules);
    expect(r.staffed).toEqual({ start: 7 * 60, end: 17 * 60 });
    expect(r.processorOutput["Processor A"]).toMatchObject({ minutes: 6 * 60 + 45 });
    expect(r.processorOutput["Processor D"]).toEqual({ display: "12:00–13:00", minutes: 13 * 60 });
    expect(r.embedding).toMatchObject({ window: { start: 7 * 60, end: 11 * 60 + 30 }, minutes: 240, display: "2–4 h" });
    expect(r).toMatchObject({ microtomyPerBlock: 4, microtomyPerExtraLevel: 2, stainRun: 30, repeatStain: 30, scanPerSlide: 2, iqcPerSlide: 1, completion: 2, physicalHandoff: 1, digitalSend: 1 });
    expect(r.decalcification).toBeNull();
  });
});

describe("demo cases", () => {
  it("26H1018 is ready for pathologist handoff (Day 1 11:15)", () => {
    expect(before.get("26H1018")).toMatchObject({ status: "ready", readyAt: "Day 1 11:15" });
  });

  it("26H1003 has no whole-case estimate while F1 is outstanding", () => {
    const e = before.get("26H1003")!;
    expect(e.status).toBe("unknown");
    expect(e.readyAt).toBeUndefined();
    expect(e.reasonUnknown).toMatch(/F1/);
  });

  it("26H1016 (decalcification) has no invented estimate", () => {
    const e = before.get("26H1016")!;
    expect(e.status).toBe("unknown");
    expect(e.readyAt).toBeUndefined();
    expect(e.activeMinutes).toBeUndefined();
    expect(e.reasonUnknown).toMatch(/decalcification/i);
  });

  it("26H1004 waits for staff review, 26H1015 for its scan record, 26H1020 for pathologist cut-up", () => {
    expect(before.get("26H1004")).toMatchObject({ status: "unknown", reasonUnknown: expect.stringMatching(/staff review/i) });
    expect(before.get("26H1015")).toMatchObject({ status: "unknown", reasonUnknown: expect.stringMatching(/missing scan event/i) });
    expect(before.get("26H1020")).toMatchObject({ status: "unknown", reasonUnknown: expect.stringMatching(/cut-up/i) });
  });

  it("26H1001: microtomy now (12 min), 30-min H&E, 4 slides scanned and checked → Day 1 12:28", () => {
    const e = before.get("26H1001")!;
    expect(e).toMatchObject({ status: "estimated", readyAt: "Day 1 12:28" });
    expect(e.components.find((c) => c.step.startsWith("Microtomy"))?.minutes).toBe(12);
  });

  it("26H1017: IQC already started → treated as finishing now, then 4 min to handoff → Day 1 11:34", () => {
    expect(before.get("26H1017")).toMatchObject({ status: "estimated", readyAt: "Day 1 11:34" });
  });

  it("26H2345 (urgent): ready for pathologist handoff at 09:30; no fault invented", () => {
    const e = before.get("26H2345")!;
    expect(e).toMatchObject({ status: "ready", readyAt: "Day 1 09:30" });
    expect(JSON.stringify(e)).not.toMatch(/fault|fail|delay/i);
  });

  it("26H1002: all three levels recorded, so H&E starts now → Day 1 12:13", () => {
    expect(before.get("26H1002")).toMatchObject({ status: "estimated", readyAt: "Day 1 12:13" });
  });
});

describe("the replayed incident adds the 30-minute repeat run (from 11:05) to exactly the 10 affected estimates", () => {
  const BASKET = Array.from({ length: 10 }, (_, i) => `26H10${String(5 + i).padStart(2, "0")}`);

  it("26H1005: Day 1 11:40 before (original run treated as finished), Day 1 11:45 after (repeat 11:05–11:35)", () => {
    expect(before.get("26H1005")).toMatchObject({ status: "estimated", readyAt: "Day 1 11:40" });
    const e = after.get("26H1005")!;
    expect(e).toMatchObject({ status: "estimated", readyAt: "Day 1 11:45" });
    expect(e.components).toContainEqual(expect.objectContaining({ step: "Repeat H&E run (started 11:05)", minutes: 30, ruleId: "H&E repeat stain" }));
    expect(e.components).toContainEqual(expect.objectContaining({ step: "H&E run failed at 10:45", note: "no recut assumed" }));
  });

  it("all 10 basket cases read Day 1 11:45 and nothing else changes", () => {
    for (const [id, b] of before) {
      const a = after.get(id)!;
      if (BASKET.includes(id)) expect(a.readyAt).toBe("Day 1 11:45");
      else expect(a).toEqual(b);
    }
  });

  it("with the failure recorded but no repeat run yet, the estimate is unknown, not guessed", () => {
    const full = loadData();
    const noRepeat = { ...full, events: full.events.filter((e) => e.eventId !== "EV-01256") };
    const e = estimateAll(ctx(noRepeat)).get("26H1005")!;
    expect(e.status).toBe("unknown");
    expect(e.reasonUnknown).toMatch(/repeat H&E run .* not yet started/i);
  });
});

describe("every estimate is explainable", () => {
  it("covers all 450 cases", () => {
    expect(before.size).toBe(450);
  });

  it("estimated cases show components, active minutes, wall-clock time and assumptions", () => {
    for (const e of before.values()) {
      if (e.status !== "estimated") continue;
      expect(e.readyAt).toMatch(/^Day \d+ \d\d:\d\d$/);
      expect(e.components.length).toBeGreaterThan(0);
      expect(e.activeMinutes).toBeGreaterThan(0);
      expect(e.wallClockMinutes).toBeGreaterThanOrEqual(0);
      expect(e.assumptions).toContain("Queues and parallel capacity not modelled");
      for (const c of e.components) if (c.minutes !== undefined) expect(c.ruleId).toBeTruthy();
    }
  });

  it("unknown estimates always say why and never carry a time", () => {
    for (const e of before.values()) {
      if (e.status !== "unknown") continue;
      expect(e.reasonUnknown).toBeTruthy();
      expect(e.readyAt).toBeUndefined();
    }
  });

  it("background cases are labelled illustrative and stage-based", () => {
    const bg = data.cases.find((c) => !c.isDemo && c.stageSnapshot === "Microtomy")!;
    expect(before.get(bg.caseId)!.assumptions).toContain("Illustrative, stage-based estimate (limited event history)");
    expect(before.get("26H1001")!.assumptions).not.toContain("Illustrative, stage-based estimate (limited event history)");
  });

  it("every decalcification case is unknown", () => {
    for (const c of data.cases.filter((x) => x.stageSnapshot === "Decalcification")) expect(before.get(c.caseId)!.status).toBe("unknown");
  });

  it("no estimate overclaims or shows workbook equipment names", () => {
    const text = JSON.stringify([...after.values()]);
    expect(findOverclaims(text)).toEqual([]);
    expect(text).not.toMatch(/Pegasus|Logos|Prisma|Stainer 1/);
  });
});

describe("targets: delay is claimed only against config/targets.json", () => {
  it("with no targets, says target comparison unavailable", () => {
    for (const e of before.values()) expect(e.target).toBe("target comparison unavailable");
  });

  it("with a routine target of 8 working hours, 26H1018 (received Day 0 06:30) is compared against Day 0 15:00", () => {
    const withTarget = estimateAll(ctx(data, { urgent: null, screening: null, routine: 8 }));
    expect(withTarget.get("26H1018")!.target).toEqual({ label: "Routine: 8 working hours", dueAt: "Day 0 15:00", late: true });
    expect(withTarget.get("26H1001")!.target).toBe("target comparison unavailable"); // screening target not set
  });
});

describe("missing timing data returns explicit uncertainty", () => {
  it("removing the H&E run rule makes staining cases unknown instead of guessing", () => {
    const d = structuredClone(data);
    d.timingRules = d.timingRules.filter((r) => r.rule !== "H&E auto-stainer run");
    const e = estimateAll(ctx(d)).get("26H1005")!;
    expect(e.status).toBe("unknown");
    expect(e.reasonUnknown).toMatch(/not configured/i);
  });
});
