// Exports the synthetic dataset for Hugging Face (see hf_dataset/README.md and
// docs/DATA_PROVENANCE.md §7): five CSVs with generic equipment names and the
// workbook's demo authoring notes removed. Usage: npm run export:hf
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { displayText, generic } from "../shared/labels";
import type { CellpathData } from "../shared/types";
import { loadData } from "../server/src/domain/load";

export const HEADERS = {
  "cases.csv": ["Case ID", "Cohort", "Sample type", "Priority", "Programme tag", "Stage snapshot", "Stage entered (simulated)", "Blocks expected", "Blocks complete", "Levels required", "Levels recorded", "Processor", "Stainer basket", "Slides in case", "Alert category", "Demo case?"],
  "blocks.csv": ["Case ID", "Block ID", "Sample type", "Current location", "Block status", "Levels required", "Levels recorded", "Case-level effect"],
  "slides.csv": ["Case ID", "Block ID", "Slide ID", "Level", "Stainer basket", "Slide status", "Scan status"],
  "events.csv": ["Event ID", "Simulated time", "Case ID", "Block ID", "Slide ID", "Stage", "Station / equipment", "Event type", "Event details", "Activation state"],
  "timing_rules.csv": ["Rule / stage", "Description", "Starting value", "Unit", "Status", "Notes"],
} as const;

type Cell = string | number | null;
const s = (v: Cell) => (v === null ? "" : String(v));
const text = (v: string | null) => (v === null ? "" : displayText(v).replace(/\bCellPath\b/g, "Meridian")); // generic labels, no authoring notes
// The product was renamed from CellPath to Meridian; the published dataset uses the current name.
const rename = (v: string) => v.replace(/\bCellPath\b/g, "Meridian");
const label = (v: string | null) => (v === null ? "" : rename(generic(v))); // generic labels only

export function buildDataset(d: CellpathData): Record<keyof typeof HEADERS, string[][]> {
  return {
    "cases.csv": [
      [...HEADERS["cases.csv"]],
      ...d.cases.map((c) =>
        [c.caseId, c.cohort, c.specimen, c.priority, c.programmeTag ?? "None", c.stageSnapshot, c.stageEnteredAt, c.blocksExpected, c.blocksComplete, c.levelsRequired, c.levelsRecorded, label(c.processor), label(c.stainerBasket), c.slidesInCase, c.alertCategory, c.isDemo ? "Yes" : "No"].map(s),
      ),
    ],
    "blocks.csv": [
      [...HEADERS["blocks.csv"]],
      ...d.blocks.map((b) => [b.caseId, b.blockId, b.specimen, label(b.location), text(b.status), b.levelsRequired, b.levelsRecorded, text(b.caseLevelEffect)].map(s)),
    ],
    "slides.csv": [[...HEADERS["slides.csv"]], ...d.slides.map((x) => [x.caseId, x.blockId, x.slideId, x.level, label(x.basket), text(x.status), text(x.scanStatus)].map(s))],
    "events.csv": [
      [...HEADERS["events.csv"]],
      ...d.events.map((e) => [e.eventId, e.at, e.caseId, e.blockId, e.slideId, e.stage, label(e.station), e.type, text(e.details), e.activation].map(s)),
    ],
    "timing_rules.csv": [[...HEADERS["timing_rules.csv"]], ...d.timingRules.map((r) => [label(r.rule), label(r.description), label(r.value), r.unit, r.status, label(r.notes)].map(s))],
  };
}

export function toCsv(rows: string[][]): string {
  const cell = (v: string) => (/[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  return rows.map((r) => r.map(cell).join(",")).join("\n") + "\n";
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const outDir = process.argv[2] ?? "hf_dataset";
  for (const [file, rows] of Object.entries(buildDataset(loadData()))) {
    writeFileSync(`${outDir}/${file}`, toCsv(rows));
    console.log(`Wrote ${outDir}/${file}: ${rows.length - 1} rows`);
  }
}
