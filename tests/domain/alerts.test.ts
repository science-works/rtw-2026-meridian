import { beforeAll, describe, expect, it } from "vitest";
import { loadData } from "../../server/src/domain/load";
import { computeAlerts } from "../../server/src/domain/alerts";
import { fireBasketFailure, isTriggerFired } from "../../server/src/domain/trigger";
import { findOverclaims } from "../../server/src/domain/wording";
import type { Alert, CellpathData } from "../../shared/types";

let data: CellpathData;
let before: Alert[];
let after: Alert[];
const byKind = (alerts: Alert[], kind: Alert["kind"]) => alerts.filter((a) => a.kind === kind);
const allText = (a: Alert) => [a.what, a.why, a.suggestedCheck, ...a.evidence.map((e) => e.text)].join(" ");

beforeAll(() => {
  data = loadData();
  before = computeAlerts(data);
  after = computeAlerts(fireBasketFailure(data));
});

describe("alerts before the trigger", () => {
  it("raises exactly three alerts: outstanding block, protocol mismatch, scan gap", () => {
    expect(before.map((a) => a.kind).sort()).toEqual(["outstanding_block", "protocol_mismatch", "scan_gap"]);
  });

  it("every alert says what, evidence, why and the suggested check", () => {
    for (const a of [...before, ...after]) {
      expect(a.what.length).toBeGreaterThan(10);
      expect(a.why.length).toBeGreaterThan(10);
      expect(a.suggestedCheck.length).toBeGreaterThan(10);
      expect(a.evidence.length).toBeGreaterThan(0);
      expect(a.raisedAt).toMatch(/^Day -?\d+ \d\d:\d\d$/);
    }
  });

  it("alert IDs are unique and stable", () => {
    expect(new Set(after.map((a) => a.id)).size).toBe(after.length);
    expect(computeAlerts(data).map((a) => a.id)).toEqual(before.map((a) => a.id));
  });
});

describe("rule 1: outstanding block (26H1003)", () => {
  it("flags only 26H1003, with F1 outstanding and A1-E1 complete", () => {
    const [a] = byKind(before, "outstanding_block");
    expect(byKind(before, "outstanding_block")).toHaveLength(1);
    expect(a.caseIds).toEqual(["26H1003"]);
    expect(a.what).toContain("5 of 6");
    expect(a.what).toContain("F1");
    expect(allText(a)).toMatch(/A1.*E1/);
    expect(a.evidence.map((e) => e.eventId)).toContain("EV-01121"); // BLOCK_PENDING for F1
    expect(allText(a)).toMatch(/no reliable whole-case/i);
  });

  it("does not flag whole cases waiting normally at cut-up (26H1020, 26H1021)", () => {
    const flagged = before.flatMap((a) => a.caseIds);
    expect(flagged).not.toContain("26H1020");
    expect(flagged).not.toContain("26H1021");
  });

  it("uses generic equipment labels, not workbook names", () => {
    const [a] = byKind(before, "outstanding_block");
    expect(allText(a)).not.toMatch(/Logos|Pegasus|Prisma/);
    expect(allText(a)).toContain("Processor D");
  });
});

describe("rule 2: protocol mismatch (26H1004)", () => {
  it("flags 26H1004 with 1 of 3 levels and asks for staff review", () => {
    const list = byKind(before, "protocol_mismatch");
    expect(list).toHaveLength(1);
    const [a] = list;
    expect(a.caseIds).toEqual(["26H1004"]);
    expect(a.slideIds).toEqual(["26H1004-S01"]);
    expect(a.what).toContain("1 of 3");
    expect(a.evidence.map((e) => e.eventId)).toEqual(expect.arrayContaining(["EV-01230"]));
    expect(a.suggestedCheck).toMatch(/review/i);
    expect(allText(a)).not.toMatch(/recut (approved|ordered)|auto-?advance(d)? to/i);
  });
});

describe("rule 3: basket failure (stainer basket 01)", () => {
  it("is pending (no alert) before the trigger", () => {
    expect(byKind(before, "basket_failure")).toHaveLength(0);
    expect(isTriggerFired(data)).toBe(false);
  });

  it("after the trigger flags exactly 20 slides across 10 cases, 26H1005-26H1014", () => {
    const list = byKind(after, "basket_failure");
    expect(list).toHaveLength(1);
    const [a] = list;
    expect(a.slideIds).toHaveLength(20);
    expect(a.caseIds).toEqual(Array.from({ length: 10 }, (_, i) => `26H10${String(5 + i).padStart(2, "0")}`));
    expect(a.evidence.map((e) => e.eventId)).toContain("EV-01215");
    expect(a.raisedAt).toBe("Day 1 11:30");
    expect(a.severity).toBe("high");
    expect(allText(a)).toMatch(/60[- ]minute repeat/i);
    expect(allText(a)).not.toMatch(/Prisma/);
  });

  it("can only fire once", () => {
    const fired = fireBasketFailure(data);
    expect(isTriggerFired(fired)).toBe(true);
    expect(() => fireBasketFailure(fired)).toThrow(/already/i);
    expect(fired.events.filter((e) => e.eventId === "EV-01215")).toHaveLength(1);
  });

  it("does not mutate the input dataset", () => {
    fireBasketFailure(data);
    expect(isTriggerFired(data)).toBe(false);
  });

  it("leaves the other three alerts unchanged", () => {
    expect(after.filter((a) => a.kind !== "basket_failure")).toEqual(before);
  });
});

describe("rule 4: scan gap (26H1015)", () => {
  it("flags 26H1015 as a missing scan event, never as misplaced", () => {
    const list = byKind(before, "scan_gap");
    expect(list).toHaveLength(1);
    const [a] = list;
    expect(a.caseIds).toEqual(["26H1015"]);
    expect(a.what.toLowerCase()).toContain("missing scan event");
    expect(a.suggestedCheck).toBe("Missing scan event; check the slide location or scan record.");
    expect(allText(a)).not.toMatch(/misplac|lost/i);
    expect(a.evidence.map((e) => e.eventId)).toContain("EV-01099"); // SCAN_EXPECTED Day 0 15:30
  });

  it("cites later comparator cases that do have scan records", () => {
    const [a] = byKind(before, "scan_gap");
    expect(allText(a)).toMatch(/\d+ later cases/);
    expect(allText(a)).toContain("26H1018");
  });
});

describe("wording guard", () => {
  it("finds no overclaims in any alert", () => {
    for (const a of after) expect(findOverclaims(allText(a))).toEqual([]);
  });

  it("catches the phrases we must never output", () => {
    expect(findOverclaims("The slide was misplaced")).not.toEqual([]);
    expect(findOverclaims("Diagnosis: adenoma")).not.toEqual([]);
    expect(findOverclaims("Reporting time is 14:00")).not.toEqual([]);
    expect(findOverclaims("It will miss the screening deadline")).not.toEqual([]);
    expect(findOverclaims("Ready for pathologist handoff")).toEqual([]);
  });
});
