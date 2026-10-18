// Insight visuals: percentile maths and dwell times from the event log.
import { describe, expect, it } from "vitest";
import { dwellsByCase, dwellStats, fmtMinutes, percentile } from "../../shared/insights";
import { loadData } from "../../server/src/domain/load";

describe("percentile (linear interpolation)", () => {
  it("matches hand-worked values", () => {
    const v = [10, 20, 30, 40, 50];
    expect(percentile(v, 0)).toBe(10);
    expect(percentile(v, 50)).toBe(30);
    expect(percentile(v, 100)).toBe(50);
    expect(percentile(v, 25)).toBe(20);
    expect(percentile(v, 10)).toBeCloseTo(14);
    expect(percentile(v, 90)).toBeCloseTo(46);
    expect(percentile([7], 90)).toBe(7);
    expect(percentile([3, 1, 2], 50)).toBe(2); // unsorted input
    expect(Number.isNaN(percentile([], 50))).toBe(true);
  });
  it("is monotonic in p", () => {
    const v = [5, 1, 9, 3, 7, 2, 8];
    const ps = [10, 25, 50, 75, 90].map((p) => percentile(v, p));
    expect(ps).toEqual([...ps].sort((a, b) => a - b));
  });
});

describe("dwell times from the event log", () => {
  const data = loadData();
  const dwells = dwellsByCase(data);
  it("covers every case; minutes are never negative; only the last stay is in progress", () => {
    expect(dwells.size).toBe(450);
    for (const ds of dwells.values()) {
      for (const d of ds) expect(d.minutes).toBeGreaterThanOrEqual(0);
      expect(ds.filter((d) => d.inProgress).length).toBeLessThanOrEqual(1);
      if (ds.some((d) => d.inProgress)) expect(ds.at(-1)!.inProgress).toBe(true);
    }
  });
  it("26H2345 is ready, so none of its stays is in progress; 26H1004 is still in microtomy", () => {
    expect(dwells.get("26H2345")!.some((d) => d.inProgress)).toBe(false);
    expect(dwells.get("26H1004")!.at(-1)).toMatchObject({ stage: "Microtomy", inProgress: true });
  });
  it("stats are ordered p10 ≤ p25 ≤ p50 ≤ p75 ≤ p90 and built from completed stays", () => {
    for (const s of dwellStats(dwells)) {
      expect(s.n).toBeGreaterThan(0);
      expect([s.p10, s.p25, s.p50, s.p75, s.p90]).toEqual([s.p10, s.p25, s.p50, s.p75, s.p90].sort((a, b) => a - b));
    }
  });
  it("formats minutes", () => {
    expect(fmtMinutes(190)).toBe("3h10");
    expect(fmtMinutes(45)).toBe("45m");
  });
});

describe("GET /api/insights/dwell", () => {
  it("returns per-stage stats and the asked case's own dwells", async () => {
    const { freshApp } = await import("../api/helpers");
    const r = await freshApp().get<{ stats: { stage: string }[]; cases: number; case: { stage: string }[] | null }>("/api/insights/dwell?case=26h1004");
    expect(r.status).toBe(200);
    expect(r.body.cases).toBe(450);
    expect(r.body.stats.map((s) => s.stage)).toContain("Microtomy");
    expect(r.body.case?.at(-1)?.stage).toBe("Microtomy");
  });
});
