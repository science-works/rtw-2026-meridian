import { beforeAll, describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { buildDataset, HEADERS, toCsv } from "../../scripts/export_hf_dataset";
import { loadData } from "../../server/src/domain/load";

let files: Record<string, string[][]>;
beforeAll(() => {
  files = buildDataset(loadData());
});

describe("Hugging Face dataset export", () => {
  it("has the five files from the dataset card with the right row counts", () => {
    const rows = Object.fromEntries(Object.entries(files).map(([f, r]) => [f, r.length - 1]));
    expect(rows).toEqual({ "cases.csv": 450, "blocks.csv": 712, "slides.csv": 426, "events.csv": 1253, "timing_rules.csv": 36 });
  });

  it("uses exactly the columns listed in hf_dataset/README.md", () => {
    for (const [f, rows] of Object.entries(files)) expect(rows[0]).toEqual(HEADERS[f as keyof typeof HEADERS]);
    expect(files["cases.csv"][0]).not.toContain("Agent response seed");
    expect(files["cases.csv"][0]).not.toContain("Handoff ETA status");
  });

  it("uses generic equipment names and strips authoring notes", () => {
    const all = Object.values(files).map((r) => toCsv(r)).join("\n");
    expect(all).not.toMatch(/Pegasus|Logos|Prisma|PRISMA|Stainer 1|Scanner [34]|Microtome |IQC desk/);
    expect(all).not.toMatch(/PENDING LIVE DEMO|Trigger this event|during the pitch|Show lab-preparation/);
    expect(all).toContain("Processor D");
    expect(all).toContain("H&E auto-stainer 1");
    expect(all).toContain("H&E-BASKET-01");
  });

  it("keeps the recorded H&E incident states and the AA/BB initials", () => {
    const ev = files["events.csv"];
    const act = ev[0].indexOf("Activation state");
    const ini = ev[0].indexOf("Fictional staff initials");
    const notRecorded = Object.fromEntries(ev.slice(1).filter((r) => r[act] !== "Recorded").map((r) => [r[0], r[act]]));
    expect(notRecorded).toEqual({ "EV-01215": "Detected; attention required", "EV-01255": "Acknowledged", "EV-01254": "In progress", "EV-01256": "In progress" });
    expect(new Set(ev.slice(1).map((r) => r[ini]).filter(Boolean))).toEqual(new Set(["AA", "BB"]));
  });

  it("writes valid CSV (quotes commas, quotes and newlines)", () => {
    expect(toCsv([["a", "b,c", 'say "hi"', "x\ny"]])).toBe('a,"b,c","say ""hi""","x\ny"\n');
  });

  it("matches the committed hf_dataset/*.csv (run `npm run export:hf` if this fails)", () => {
    for (const [f, rows] of Object.entries(files)) {
      const path = `hf_dataset/${f}`;
      expect(existsSync(path)).toBe(true);
      expect(readFileSync(path, "utf8")).toBe(toCsv(rows));
    }
  });
});
