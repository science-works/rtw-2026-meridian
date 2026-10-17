// The required tests from CLAUDE.md, in one place. Estimate-specific checks are
// extended in tests/domain/estimate.test.ts (A5).
import { beforeAll, describe, expect, it } from "vitest";
import { loadData } from "../../server/src/domain/load";
import { validate } from "../../server/src/domain/validate";
import { computeAlerts } from "../../server/src/domain/alerts";
import { fireBasketFailure } from "../../server/src/domain/trigger";
import { findOverclaims } from "../../server/src/domain/wording";
import { estimateAll } from "../../server/src/domain/estimate";
import { splitStaged } from "../../server/src/domain/incident";
import type { CellpathData, EventRecord } from "../../shared/types";

let data: CellpathData; // the full workbook
let log: CellpathData; // the 11:30 log with the incident held back
let staged: EventRecord[];
const fired = () => fireBasketFailure(log, staged);
const caseOf = (id: string) => data.cases.find((c) => c.caseId === id)!;
beforeAll(() => {
  data = loadData();
  ({ data: log, staged } = splitStaged(data));
});

describe("CLAUDE.md required tests", () => {
  it("1. 450 cases = 104 backlog + 346 current-day", () => {
    expect(validate(data).counts).toMatchObject({ cases: 450, backlog: 104, today: 346 });
  });

  it("2. all case/block/slide/event links resolve", () => {
    expect(validate(data).errors.filter((e) => e.code.endsWith("_link"))).toEqual([]);
  });

  it("3. event order is valid and nothing is after Day 1 11:30", () => {
    const errs = validate(data).errors.map((e) => e.code);
    expect(errs).not.toContain("event_order");
    expect(errs).not.toContain("event_after_clock");
  });

  it("4. each of the four alerts returns the expected IDs (incident replayed)", () => {
    const alerts = computeAlerts(fired());
    const ids = Object.fromEntries(alerts.map((a) => [a.kind, a.caseIds]));
    expect(ids.outstanding_block).toEqual(["26H1003"]);
    expect(ids.protocol_mismatch).toEqual(["26H1004"]);
    expect(ids.scan_gap).toEqual(["26H1015"]);
    expect(ids.basket_failure).toHaveLength(10);
  });

  it("5. the incident replay flags exactly 20 slides and 10 cases, exactly once", () => {
    const once = fired();
    const basket = computeAlerts(once).find((a) => a.kind === "basket_failure")!;
    expect(basket.slideIds).toHaveLength(20);
    expect(basket.caseIds).toHaveLength(10);
    expect(() => fireBasketFailure(once, staged)).toThrow();
  });

  it("6. 26H1003 is not ready while F1 is outstanding", () => {
    expect(caseOf("26H1003").stageSnapshot).not.toBe("Ready for pathologist handoff");
    expect(computeAlerts(log).some((a) => a.kind === "outstanding_block" && a.caseIds.includes("26H1003"))).toBe(true);
  });

  it("7. 26H1004 shows 1 of 3 levels", () => {
    expect(computeAlerts(data).find((a) => a.kind === "protocol_mismatch")!.what).toContain("1 of 3");
  });

  it("8. 26H1015 is described only as a missing scan event", () => {
    const a = computeAlerts(data).find((x) => x.caseIds.includes("26H1015"))!;
    expect(a.what.toLowerCase()).toContain("missing scan event");
    expect(JSON.stringify(a)).not.toMatch(/misplac|lost/i);
  });

  it("9. 26H1016 (decalcification) is not flagged", () => {
    expect(computeAlerts(fired()).flatMap((a) => a.caseIds)).not.toContain("26H1016");
  });

  it("10. 26H2345 stays urgent with no invented fault, ready for handoff at 09:30", () => {
    expect(caseOf("26H2345").priority).toBe("Urgent");
    expect(caseOf("26H2345").stageSnapshot).toBe("Ready for pathologist handoff");
    const e = estimateAll({ data: log, alerts: computeAlerts(log), targets: { urgent: null, screening: null, routine: null } }).get("26H2345")!;
    expect(e).toMatchObject({ status: "ready", readyAt: "Day 1 09:30" });
    expect(computeAlerts(fired()).flatMap((a) => a.caseIds)).not.toContain("26H2345");
  });

  it("11. 26H1018 is ready for pathologist handoff", () => {
    expect(caseOf("26H1018").stageSnapshot).toBe("Ready for pathologist handoff");
  });

  it("12. no alert claims a diagnosis, a reporting time or a screening deadline", () => {
    expect(findOverclaims(JSON.stringify(computeAlerts(fired())))).toEqual([]);
  });

  it("13. missing data returns explicit uncertainty", () => {
    const d = structuredClone(data);
    d.timingRules = d.timingRules.filter((r) => r.rule !== "Digital scanners");
    const e = estimateAll({ data: d, alerts: computeAlerts(d), targets: { urgent: null, screening: null, routine: null } }).get("26H1017")!;
    expect(e.status).toBe("estimated"); // 26H1017 is already scanned, so the scan rule is not needed
    const e2 = estimateAll({ data: d, alerts: computeAlerts(d), targets: { urgent: null, screening: null, routine: null } }).get("26H1001")!;
    expect(e2).toMatchObject({ status: "unknown", reasonUnknown: expect.stringMatching(/not configured/i) });
  });
});
