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
    expect(rows).toEqual({ "cases.csv": 450, "blocks.csv": 712, "slides.csv": 423, "events.csv": 1230, "timing_rules.csv": 26 });
  });

  it("uses exactly the columns listed in hf_dataset/README.md", () => {
    for (const [f, rows] of Object.entries(files)) expect(rows[0]).toEqual(HEADERS[f as keyof typeof HEADERS]);
    expect(files["cases.csv"][0]).not.toContain("Agent response seed");
    expect(files["cases.csv"][0]).not.toContain("Handoff ETA status");
  });

  it("uses generic equipment names and strips authoring notes", () => {
    const all = Object.values(files).map((r) => toCsv(r)).join("\n");
    expect(all).not.toMatch(/Pegasus|Logos|Prisma|PRISMA/);
    expect(all).not.toMatch(/PENDING LIVE DEMO|Trigger this event|during the pitch|Show lab-preparation/);
    expect(all).not.toMatch(/CellPath/);
    expect(all).toContain("Processor D");
    expect(all).toContain("Stainer 1 basket 01");
  });

  it("keeps exactly one staged live-trigger event", () => {
    const ev = files["events.csv"];
    const col = ev[0].indexOf("Activation state");
    expect(ev.slice(1).filter((r) => r[col] === "Pending live trigger").map((r) => r[0])).toEqual(["EV-01215"]);
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
