import { describe, expect, it } from "vitest";
import type { Alert } from "../../shared/types";
import { stainerReadout } from "../../web/src/corners/BottomLeft";
import { freshApp } from "../api/helpers";

function basket(over: Partial<Alert> = {}): Alert {
  return {
    id: "ALERT-BASKET",
    kind: "basket_failure",
    state: "in_progress",
    stateDetail: "Troubleshooting / resolving — re-staining · Stain run completes ~11:35",
    history: [],
    where: "H&E auto-stainer 1",
    raisedAt: "Day 1 10:45" as Alert["raisedAt"],
    caseIds: ["C1", "C2"],
    slideIds: ["S1", "S2", "S3"],
    what: "",
    evidence: [],
    why: "",
    suggestedCheck: "",
    ...over,
  } as Alert;
}

describe("stainerReadout", () => {
  it("in progress: shows the completion part of the state detail and counts", () => {
    expect(stainerReadout([basket()])).toEqual({ value: "Stain run completes ~11:35", sub: "3 slides · 2 cases" });
  });
  it("state detail without the phrase falls back to Re-staining", () => {
    expect(stainerReadout([basket({ stateDetail: "Basket reloaded 11:04" })]).value).toBe("Re-staining");
    expect(stainerReadout([basket({ stateDetail: undefined })]).value).toBe("Re-staining");
  });
  it("resolved: no stainer incident", () => {
    expect(stainerReadout([basket({ state: "resolved" })])).toEqual({ value: "No stainer incident", sub: "H&E auto-stainer 1" });
  });
  it("missing: no stainer incident", () => {
    expect(stainerReadout([])).toEqual({ value: "No stainer incident", sub: "H&E auto-stainer 1" });
  });
  it("real data: stain run completes ~11:35, 20 slides across 10 cases", async () => {
    const alerts = (await freshApp().get<Alert[]>("/api/alerts")).body;
    expect(stainerReadout(alerts)).toEqual({ value: "Stain run completes ~11:35", sub: "20 slides · 10 cases" });
  });
});
