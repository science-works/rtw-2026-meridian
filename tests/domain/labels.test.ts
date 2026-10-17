import { describe, expect, it } from "vitest";
import { displayText, generic } from "../../shared/labels";

describe("generic equipment labels", () => {
  it("maps workbook equipment to generic names", () => {
    expect(generic("Logos Evo")).toBe("Processor D");
    expect(generic("Pegasus A and Pegasus 2, then Logos 1")).toBe("Processor A and Processor B, then Processor C");
    expect(generic("Prisma basket PRISMA-BASKET-01")).toBe("Stainer 1 basket 01");
    expect(generic("Prisma auto-stainer")).toBe("Stainer 1");
    expect(generic(null)).toBeNull();
  });
});

describe("displayText", () => {
  it("drops authoring notes and scope notes but keeps the recorded facts", () => {
    expect(displayText("Stage at Tuesday 11:30: BCSP-linked biopsy; waiting in the microtomy queue. Show lab-preparation handoff estimate only, not the programme reporting deadline..")).toBe(
      "Stage at Tuesday 11:30: BCSP-linked biopsy; waiting in the microtomy queue.",
    );
    expect(displayText("BCSP linked; lab-handoff target remains an editable rule; full reporting deadline out of scope.")).toBe("BCSP linked.");
    expect(displayText("PENDING LIVE DEMO TRIGGER: 20 slides across 26H1005-26H1014. Trigger this event during the pitch; affected cases and slides are linked in the Slides sheet.")).toBe(
      "20 slides across 26H1005-26H1014.",
    );
  });

  it("leaves ordinary event text alone apart from labels", () => {
    expect(displayText("Block A1 loaded for the overnight large-specimen run.")).toBe("Block A1 loaded for the overnight large-specimen run.");
    expect(displayText("Loaded into Logos Evo.")).toBe("Loaded into Processor D.");
  });
});
