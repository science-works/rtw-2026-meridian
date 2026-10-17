import { describe, expect, it } from "vitest";
import { displayText, generic, stationParts } from "../../shared/labels";

describe("station label normalisation (display only)", () => {
  it("maps the raw workbook variants to the spec's equipment labels", () => {
    expect(generic("Microtome station 4")).toBe("Microtomy station 4");
    expect(generic("Microtome 1")).toBe("Microtomy station 1");
    expect(generic("IQC desk")).toBe("IQC workstation 1");
    expect(generic("IQC station")).toBe("IQC workstation 1");
    for (const raw of ["H&E stainer", "H&E auto-stainer", "H&E auto-stainer 1 / Box 1 / Basket 1", "H&E auto-stainer basket H&E-BASKET-01", "H&E auto-stainer / repeat run", "Priority H&E run"]) {
      expect(generic(raw)).toBe("H&E auto-stainer 1");
    }
    expect(generic("Digital scanner")).toBe("Scanner queue");
    expect(generic("Digital scan queue")).toBe("Scanner queue");
    expect(generic("Scanner 1")).toBe("Digital scanner 1");
    expect(generic("Processor D")).toBe("Processor D");
    expect(generic(null)).toBeNull();
  });

  it("keeps the stainer box and basket as separate fields", () => {
    expect(stationParts("H&E auto-stainer 1 / Box 1 / Basket 1")).toEqual({ box: "Box 1", basket: "Basket 1" });
    expect(stationParts("H&E auto-stainer basket H&E-BASKET-01")).toEqual({ basket: "H&E-BASKET-01" });
    expect(stationParts("Processor A")).toEqual({});
  });
});

describe("displayText", () => {
  it("drops authoring notes and scope notes but keeps the recorded facts", () => {
    expect(displayText("Stage at Tuesday 11:30: BCSP-linked biopsy; waiting in the microtomy queue. Show lab-preparation handoff estimate only, not the programme reporting deadline..")).toBe(
      "Stage at Tuesday 11:30: BCSP-linked biopsy; waiting in the microtomy queue.",
    );
    expect(displayText("BCSP linked; lab-handoff target remains an editable rule; full reporting deadline out of scope.")).toBe("BCSP linked.");
  });

  it("leaves ordinary event text alone apart from labels", () => {
    expect(displayText("Block A1 loaded for the overnight large-specimen run.")).toBe("Block A1 loaded for the overnight large-specimen run.");
    expect(displayText("Only level 1 cut at Microtome station 4.")).toBe("Only level 1 cut at Microtomy station 4.");
  });
});
