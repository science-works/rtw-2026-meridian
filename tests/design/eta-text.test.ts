// Every case-row ETA reads "Ready ~HH:MM", "Ready since HH:MM" or "ETA unknown — <full reason>".
import { describe, expect, it } from "vitest";
import type { Alert, CaseSummary } from "../../shared/types";
import { etaText } from "../../web/src/caseLine";
import { freshApp } from "../api/helpers";

describe("case-row ETA wording", () => {
  it("stainer cases read 'Ready ~11:45'; the incident reads 'Stain run completes ~11:35'", async () => {
    const { get } = freshApp();
    const cases = (await get<CaseSummary[]>("/api/cases")).body;
    const basket = (await get<Alert[]>("/api/alerts")).body.find((a) => a.kind === "basket_failure")!;
    for (const id of basket.caseIds) expect(etaText(cases.find((c) => c.caseId === id)!).text).toBe("Ready ~11:45");
    expect(basket.stateDetail).toContain("Stain run completes ~11:35");
  });

  it("every case has one of the three forms, and unknown reasons are never shortened", async () => {
    const { get } = freshApp();
    for (const c of (await get<CaseSummary[]>("/api/cases")).body) {
      const e = etaText(c);
      expect(e.text).toMatch(/^(Ready ~(Day \d+ )?\d\d:\d\d|Ready since (Day \d+ )?\d\d:\d\d|ETA unknown)$/);
      if (e.tone === "unknown") expect(e.reason).toBe(c.estimate.reasonUnknown?.replace(/\.$/, ""));
    }
    expect(etaText((await get<CaseSummary[]>("/api/cases")).body.find((c) => c.caseId === "26H2345")!).text).toBe("Ready since 09:30");
  });
});
