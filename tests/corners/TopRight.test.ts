import { describe, expect, it } from "vitest";
import type { CaseSummary } from "../../shared/types";
import { parseSimTime } from "../../shared/clock";
import { nextMilestones } from "../../web/src/corners/TopRight";
import { freshApp } from "../api/helpers";

const mk = (caseId: string, status: "estimated" | "unknown" | "ready", readyAt?: string) =>
  ({ caseId, estimate: { status, readyAt, components: [], assumptions: [] } }) as unknown as CaseSummary;

describe("nextMilestones", () => {
  it("keeps only estimated cases", () => {
    const out = nextMilestones([mk("A", "ready", "Day 1 09:30"), mk("B", "unknown"), mk("C", "estimated", "Day 1 14:00")]);
    expect(out).toEqual([{ caseId: "C", at: "Day 1 14:00" }]);
  });

  it("sorts by parsed time across days, ties by case ID", () => {
    const out = nextMilestones([
      mk("26H0003", "estimated", "Day 2 00:10"),
      mk("26H0002", "estimated", "Day 1 23:50"),
      mk("26H0001", "estimated", "Day 1 23:50"),
    ]);
    expect(out.map((r) => r.caseId)).toEqual(["26H0001", "26H0002", "26H0003"]);
  });

  it("limits to n", () => {
    const cases = ["E", "D", "C", "B", "A"].map((id, i) => mk(id, "estimated", `Day 1 1${i}:00`));
    expect(nextMilestones(cases)).toHaveLength(3);
    expect(nextMilestones(cases, 2).map((r) => r.caseId)).toEqual(["E", "D"]);
  });

  it("returns empty when nothing is estimated", () => {
    expect(nextMilestones([])).toEqual([]);
    expect(nextMilestones([mk("A", "unknown")])).toEqual([]);
  });
});

describe("nextMilestones on real data", () => {
  it("returns 3 estimated handoffs in non-decreasing time order", async () => {
    const { get } = freshApp();
    const cases = (await get<CaseSummary[]>("/api/cases")).body;
    const out = nextMilestones(cases);
    expect(out).toHaveLength(3);
    const byId = new Map(cases.map((c) => [c.caseId, c]));
    for (const r of out) {
      expect(byId.get(r.caseId)!.estimate.status).toBe("estimated");
      expect(byId.get(r.caseId)!.estimate.readyAt).toBe(r.at);
    }
    const times = out.map((r) => parseSimTime(r.at));
    for (let i = 1; i < times.length; i++) expect(times[i]).toBeGreaterThanOrEqual(times[i - 1]);
  });
});
