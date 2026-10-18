import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { CaseSummary } from "../../shared/types";
import { parseSimTime } from "../../shared/clock";
import { BottomRight, handoffReadout } from "../../web/src/corners/BottomRight";
import { freshApp } from "../api/helpers";

const READY = "Ready for pathologist handoff";
const mk = (caseId: string, stage: string, status: "ready" | "estimated" | "unknown", readyAt?: string) =>
  ({ caseId, stage, estimate: { status, readyAt } }) as unknown as CaseSummary;

describe("handoffReadout", () => {
  it("counts only cases at the handoff stage", () => {
    const r = handoffReadout([mk("A", READY, "ready", "Day 1 09:00"), mk("B", "IQC", "estimated", "Day 1 12:00"), mk("C", READY, "unknown")]);
    expect(r.count).toBe(2);
    expect(r.last).toEqual({ caseId: "A", at: "Day 1 09:00" });
  });

  it("picks the latest by parsed time across days", () => {
    const r = handoffReadout([mk("X", READY, "ready", "Day 1 07:05"), mk("Y", READY, "ready", "Day 0 16:50"), mk("Z", READY, "ready", "Day -1 23:00")]);
    expect(r.last).toEqual({ caseId: "X", at: "Day 1 07:05" });
  });

  it("breaks ties by case ID", () => {
    const r = handoffReadout([mk("26H0002", READY, "ready", "Day 1 09:30"), mk("26H0009", READY, "ready", "Day 1 09:30"), mk("26H0005", READY, "ready", "Day 1 09:30")]);
    expect(r.last?.caseId).toBe("26H0009");
  });

  it("returns none when nothing is ready", () => {
    expect(handoffReadout([])).toEqual({ count: 0, last: null });
    expect(handoffReadout([mk("A", READY, "estimated", "Day 1 12:00")])).toEqual({ count: 1, last: null });
  });
});

describe("BottomRight on real data", () => {
  it("shows 8 handed off and the latest real ready case", async () => {
    const cases = (await freshApp().get<CaseSummary[]>("/api/cases")).body;
    const r = handoffReadout(cases);
    expect(r.count).toBe(8);
    expect(r.last).not.toBeNull();
    const ready = cases.filter((c) => c.stage === READY && c.estimate.status === "ready" && c.estimate.readyAt);
    const max = Math.max(...ready.map((c) => parseSimTime(c.estimate.readyAt!)));
    const hit = cases.find((c) => c.caseId === r.last!.caseId)!;
    expect(hit.stage).toBe(READY);
    expect(parseSimTime(hit.estimate.readyAt!)).toBe(max);
    expect(r.last!.at).toBe(hit.estimate.readyAt);

    const html = renderToStaticMarkup(createElement(BottomRight, { cases, alerts: [], overview: {} as never, motion: false }));
    expect(html).toContain('data-testid="corner-bottom-right"');
    expect(html).toContain("handed off");
    expect(html).toContain(r.last!.caseId);
    expect(html).not.toMatch(/reported/i);
  });
});
