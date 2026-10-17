import { beforeAll, describe, expect, it } from "vitest";
import { loadData } from "../../server/src/domain/load";
import { validate } from "../../server/src/domain/validate";
import type { CellpathData } from "../../shared/types";

let data: CellpathData;
const clone = (): CellpathData => structuredClone(data);
const codes = (d: CellpathData) => validate(d).errors.map((e) => e.code);

beforeAll(() => {
  data = loadData();
});

describe("validate: the real dataset (P1 done-when)", () => {
  it("passes with no errors", () => {
    const r = validate(data);
    expect(r.errors).toEqual([]);
    expect(r.ok).toBe(true);
  });

  it("reconciles 450 = 104 backlog + 346 current-day", () => {
    expect(validate(data).counts).toMatchObject({ cases: 450, backlog: 104, today: 346, blocks: 712, slides: 426, events: 1253 });
  });

  it("reconciles computed stage counts with the workbook Overview tab", () => {
    const stages = validate(data).counts.stages;
    expect(stages).toEqual(data.meta.overviewStages);
    expect(stages.reduce((n, s) => n + s.total, 0)).toBe(450);
    expect(stages.find((s) => s.stage === "Microtomy")).toEqual({ stage: "Microtomy", backlog: 103, today: 36, total: 139 });
    expect(Object.fromEntries(stages.map((s) => [s.stage, s.total]))).toEqual({
      "Received/booked": 72,
      "Waiting for dissection/cut-up": 3,
      "Awaiting processor or processing": 151,
      Decalcification: 20,
      Embedding: 29,
      Microtomy: 139,
      "H&E staining": 15,
      Scanning: 8,
      IQC: 5,
      "Ready for pathologist handoff": 8,
    });
  });

  it("finds no event after Day 1 11:30", () => {
    expect(validate(data).counts.latestEventAt).toBe("Day 1 11:30");
  });
});

describe("validate: catches broken data", () => {
  it("flags a cohort split that does not reconcile", () => {
    const d = clone();
    d.cases[0].cohort = d.cases[0].cohort === "Current-day workload" ? "Previous-day backlog" : "Current-day workload";
    expect(codes(d)).toContain("cohort_counts");
  });

  it("flags a block that points at an unknown case", () => {
    const d = clone();
    d.blocks[0].caseId = "26H9999";
    expect(codes(d)).toContain("block_case_link");
  });

  it("flags a slide that points at an unknown block", () => {
    const d = clone();
    d.slides[0].blockId = "Z9";
    expect(codes(d)).toContain("slide_block_link");
  });

  it("flags events with unknown case, block or slide", () => {
    const d = clone();
    d.events[0].caseId = "26H9999";
    const withBlock = d.events.findIndex((e) => e.blockId);
    d.events[withBlock].blockId = "Z9";
    d.events.push({ ...d.events[1], eventId: "EV-99999", slideId: "26H0000-S01" });
    const c = codes(d);
    expect(c).toContain("event_case_link");
    expect(c).toContain("event_block_link");
    expect(c).toContain("event_slide_link");
  });

  it("flags an event after the Day 1 11:30 clock", () => {
    const d = clone();
    d.events[0].at = "Day 1 11:31";
    expect(codes(d)).toContain("event_after_clock");
  });

  it("flags out-of-order events (staining complete after scan complete)", () => {
    const d = clone();
    const scan = d.events.find((e) => e.type === "SCAN_COMPLETE" && d.events.some((x) => x.caseId === e.caseId && x.type === "STAINING_COMPLETE"))!;
    const stain = d.events.find((e) => e.caseId === scan.caseId && e.type === "STAINING_COMPLETE")!;
    stain.at = "Day 1 11:30";
    scan.at = "Day 1 11:00";
    expect(codes(d)).toContain("event_order");
  });

  it("flags an event before the case was received", () => {
    const d = clone();
    const rec = d.events.find((e) => e.type === "CASE_RECEIVED")!;
    d.events.push({ ...rec, eventId: "EV-99998", type: "CUTUP_COMPLETE", at: "Day -2 07:00" });
    expect(codes(d)).toContain("event_before_receipt");
  });

  it("flags a case with no receipt event", () => {
    const d = clone();
    d.events = d.events.filter((e) => !(e.caseId === "26H1018" && e.type === "CASE_RECEIVED"));
    expect(codes(d)).toContain("missing_receipt");
  });

  it("flags duplicate IDs", () => {
    const d = clone();
    d.events.push({ ...d.events[0] });
    d.slides.push({ ...d.slides[0] });
    const c = codes(d);
    expect(c).toContain("duplicate_event");
    expect(c).toContain("duplicate_slide");
  });

  it("flags a missing or altered incident event", () => {
    const d = clone();
    d.events = d.events.filter((e) => e.eventId !== "EV-01256");
    expect(codes(d)).toContain("incident_events");
  });

  it("flags staff initials other than AA/BB, or outside embedding", () => {
    const d = clone();
    d.events.find((e) => e.initials === "AA")!.initials = "ZZ";
    d.events.find((e) => e.type === "CASE_RECEIVED")!.initials = "BB";
    expect(validate(d).errors.filter((e) => e.code === "initials")).toHaveLength(2);
  });

  it("flags a slide for a case that has not reached microtomy", () => {
    const d = clone();
    const early = d.cases.find((c) => c.stageSnapshot === "Received/booked")!;
    d.slides.push({ ...d.slides[0], slideId: "X-S01", caseId: early.caseId, blockId: d.blocks.find((b) => b.caseId === early.caseId)!.blockId });
    expect(codes(d)).toContain("slide_before_microtomy");
  });

  it("flags a latest-event stage that disagrees with the snapshot", () => {
    const d = clone();
    d.cases.find((c) => c.caseId === "26H1018")!.stageSnapshot = "IQC";
    expect(codes(d)).toContain("snapshot_mismatch");
  });

  it("flags block/slide counts that disagree with the case row", () => {
    const d = clone();
    d.cases.find((c) => c.caseId === "26H1003")!.blocksExpected = 7;
    expect(codes(d)).toContain("block_count");
  });
});
