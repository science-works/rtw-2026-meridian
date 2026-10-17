import { beforeAll, describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { convertWorkbook } from "../../scripts/convert";
import type { CellpathData } from "../../shared/types";

const XLSX_PATH = "data/CellPath_Mock_Data.xlsx";
const JSON_PATH = "data/cellpath.json";

let data: CellpathData;
beforeAll(() => {
  data = convertWorkbook(XLSX_PATH);
});

describe("convertWorkbook (P1)", () => {
  it("reads every row and skips blank rows", () => {
    expect(data.cases).toHaveLength(450);
    expect(data.blocks).toHaveLength(712);
    expect(data.slides).toHaveLength(426);
    expect(data.events).toHaveLength(1253);
    expect(data.cases.every((c) => c.caseId)).toBe(true);
  });

  it("splits 450 cases into 104 backlog + 346 current-day", () => {
    expect(data.cases.filter((c) => c.cohort === "Previous-day backlog")).toHaveLength(104);
    expect(data.cases.filter((c) => c.cohort === "Current-day workload")).toHaveLength(346);
  });

  it("marks exactly 22 demo cases", () => {
    expect(data.cases.filter((c) => c.isDemo)).toHaveLength(22);
  });

  it("records the shared clock and the simulated flag", () => {
    expect(data.meta.clock).toBe("Day 1 11:30");
    expect(data.meta.simulated).toBe(true);
    expect(data.meta.overviewTotals).toEqual({ total: 450, backlog: 104, today: 346, ready: 8 });
    expect(data.meta.overviewStages).toHaveLength(10);
  });

  it("normalises fields without inventing values", () => {
    const c = data.cases.find((x) => x.caseId === "26H2345")!;
    expect(c.priority).toBe("Urgent");
    expect(c.programmeTag).toBeNull(); // "None" in the workbook
    expect(c.stainerBasket).toBeNull();
    const c1004 = data.cases.find((x) => x.caseId === "26H1004")!;
    expect(c1004.levelsRequired).toBe(3);
    expect(c1004.levelsRecorded).toBe(1);
  });

  it("does not carry the free-text ETA column", () => {
    expect(Object.keys(data.cases[0])).not.toContain("handoffEtaStatus");
    expect(JSON.stringify(data.cases)).not.toContain("App estimates");
  });

  it("keeps the recorded H&E incident with its workbook activation states", () => {
    const state = (id: string) => data.events.find((e) => e.eventId === id);
    expect(state("EV-01215")).toMatchObject({ type: "STAIN_RUN_FAILED", at: "Day 1 10:45", activation: "Detected; attention required" });
    expect(state("EV-01255")).toMatchObject({ type: "INCIDENT_ACKNOWLEDGED", at: "Day 1 10:47", activation: "Acknowledged" });
    expect(state("EV-01254")).toMatchObject({ type: "BASKET_RELOADED", at: "Day 1 11:04", activation: "In progress" });
    expect(state("EV-01256")).toMatchObject({ type: "REPEAT_STAIN_STARTED", at: "Day 1 11:05", activation: "In progress" });
  });

  it("reads the fictional staff initials column (AA 40, BB 36)", () => {
    const n = (x: string) => data.events.filter((e) => e.initials === x).length;
    expect([n("AA"), n("BB")]).toEqual([40, 36]);
    expect(data.events.filter((e) => e.initials && !["AA", "BB"].includes(e.initials))).toEqual([]);
  });

  it("has the verified programme, priority and basket mix", () => {
    const count = <T,>(xs: T[]) => xs.reduce((m, x) => m.set(x, (m.get(x) ?? 0) + 1), new Map<T, number>());
    expect(Object.fromEntries(count(data.cases.map((c) => c.programmeTag ?? "None")))).toEqual({ BCSP: 11, "Cervical screening": 132, None: 307 });
    expect(Object.fromEntries(count(data.cases.map((c) => c.priority)))).toEqual({ Urgent: 15, Routine: 435 });
    expect(data.slides.filter((s) => s.basket === "H&E-BASKET-01")).toHaveLength(20);
    expect(data.slides.filter((s) => s.basket === "URGENT-H&E-RUN-01")).toHaveLength(3);
  });

  it("loads the timing rules", () => {
    expect(data.timingRules.length).toBeGreaterThanOrEqual(20);
    expect(data.timingRules.find((r) => r.rule === "Decalcification")?.value).toMatch(/no fixed ETA/i);
  });

  it("matches the committed data/cellpath.json (run `npm run convert` if this fails)", () => {
    expect(existsSync(JSON_PATH)).toBe(true);
    const onDisk = JSON.parse(readFileSync(JSON_PATH, "utf8"));
    expect(onDisk).toEqual(data);
  });
});
