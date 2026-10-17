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
    expect(data.slides).toHaveLength(423);
    expect(data.events).toHaveLength(1230);
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
    expect(data.meta.overviewTotals).toEqual({ total: 450, backlog: 104, today: 346, ready: 7 });
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

  it("keeps the staged basket failure as the only pending event", () => {
    const pending = data.events.filter((e) => e.activation !== "Recorded");
    expect(pending.map((e) => e.eventId)).toEqual(["EV-01215"]);
    expect(pending[0].type).toBe("STAIN_RUN_FAILED");
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
