// Converts the source workbook (never edited) into data/cellpath.json.
// Usage: npm run convert
import { readFileSync, writeFileSync } from "node:fs";
import { basename } from "node:path";
import { fileURLToPath } from "node:url";
import * as XLSX from "xlsx";
import { STAGES } from "../shared/types";
import type {
  ActivationState,
  BlockRecord,
  CaseRecord,
  CellpathData,
  Cohort,
  EventRecord,
  OverviewStageRow,
  SlideRecord,
  Stage,
  TimingRule,
} from "../shared/types";

type Row = Record<string, unknown>;

const DEFAULT_IN = "data/CellPath_Mock_Data.xlsx";
const DEFAULT_OUT = "data/cellpath.json";

function text(v: unknown): string {
  return v == null ? "" : String(v).trim();
}
function optText(v: unknown): string | null {
  const s = text(v);
  return s === "" ? null : s;
}
function num(v: unknown, field: string): number {
  const n = Number(v);
  if (v == null || v === "" || Number.isNaN(n)) throw new Error(`Expected a number for ${field}, got ${JSON.stringify(v)}`);
  return n;
}
function stage(v: unknown, field: string): Stage {
  const s = text(v);
  if (!(STAGES as readonly string[]).includes(s)) throw new Error(`Unknown stage for ${field}: "${s}"`);
  return s as Stage;
}
function cohort(v: unknown, id: string): Cohort {
  const s = text(v);
  if (s !== "Previous-day backlog" && s !== "Current-day workload") throw new Error(`Unknown cohort for ${id}: "${s}"`);
  return s;
}

/** Sheet rows as objects keyed by header, with blank rows dropped. */
function rows(wb: XLSX.WorkBook, sheet: string, key: string): Row[] {
  const ws = wb.Sheets[sheet];
  if (!ws) throw new Error(`Missing sheet "${sheet}"`);
  return XLSX.utils.sheet_to_json<Row>(ws, { defval: null, blankrows: false }).filter((r) => text(r[key]) !== "");
}

function parseOverview(wb: XLSX.WorkBook): Pick<CellpathData["meta"], "overviewStages" | "overviewTotals"> {
  const grid = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets["Overview"], { header: 1, defval: null, blankrows: false });
  const head = grid.findIndex((r) => text(r[0]) === "TRACKED CASES");
  if (head < 0) throw new Error("Overview: totals header not found");
  const t = grid[head + 1];
  const overviewTotals = { total: num(t[0], "total"), backlog: num(t[3], "backlog"), today: num(t[6], "today"), ready: num(t[10], "ready") };
  const overviewStages: OverviewStageRow[] = grid
    .filter((r) => (STAGES as readonly string[]).includes(text(r[0])))
    .map((r) => ({ stage: text(r[0]) as Stage, backlog: num(r[1], "backlog"), today: num(r[2], "today"), total: num(r[3], "total") }));
  return { overviewStages, overviewTotals };
}

export function convertWorkbook(path: string = DEFAULT_IN): CellpathData {
  const wb = XLSX.read(readFileSync(path));

  const cases: CaseRecord[] = rows(wb, "Cases450", "Case ID").map((r) => {
    const id = text(r["Case ID"]);
    const tag = text(r["Programme tag"]);
    return {
      caseId: id,
      cohort: cohort(r["Cohort"], id),
      specimen: text(r["Sample type"]),
      priority: text(r["Priority"]),
      programmeTag: tag === "" || tag === "None" ? null : tag,
      stageSnapshot: stage(r["Stage snapshot"], id),
      stageEnteredAt: text(r["Stage entered (simulated)"]),
      summary: text(r["Latest status/event summary"]),
      blocksExpected: num(r["Blocks expected"], `${id} blocks expected`),
      blocksComplete: num(r["Blocks complete"], `${id} blocks complete`),
      levelsRequired: num(r["Levels required"], `${id} levels required`),
      levelsRecorded: num(r["Levels recorded"], `${id} levels recorded`),
      processor: optText(r["Processor"]),
      stainerBasket: optText(r["Stainer basket"]),
      slidesInCase: num(r["Slides in case"], `${id} slides`),
      alertCategory: optText(r["Alert category"]),
      isDemo: text(r["Demo case?"]) === "Yes",
    };
  });

  const blocks: BlockRecord[] = rows(wb, "Blocks", "Case ID").map((r) => ({
    caseId: text(r["Case ID"]),
    blockId: text(r["Block ID"]),
    specimen: text(r["Sample type"]),
    location: text(r["Current location"]),
    status: text(r["Block status"]),
    levelsRequired: num(r["Levels required"], "block levels required"),
    levelsRecorded: num(r["Levels recorded"], "block levels recorded"),
    caseLevelEffect: optText(r["Case-level effect"]),
  }));

  const slides: SlideRecord[] = rows(wb, "Slides", "Slide ID").map((r) => ({
    caseId: text(r["Case ID"]),
    blockId: text(r["Block ID"]),
    slideId: text(r["Slide ID"]),
    level: optText(r["Level"]),
    basket: optText(r["Stainer basket"]),
    status: text(r["Slide status"]),
    scanStatus: text(r["Scan status"]),
  }));

  const events: EventRecord[] = rows(wb, "Events", "Event ID").map((r) => ({
    eventId: text(r["Event ID"]),
    at: text(r["Simulated time"]),
    caseId: text(r["Case ID"]),
    blockId: optText(r["Block ID"]),
    slideId: optText(r["Slide ID"]),
    stage: text(r["Stage"]),
    station: optText(r["Station / equipment"]),
    type: text(r["Event type"]),
    details: text(r["Event details"]),
    activation: text(r["Activation state"]) as ActivationState,
    initials: optText(r["Fictional staff initials"]),
  }));

  const timingRules: TimingRule[] = rows(wb, "Timing Rules", "Rule / stage").map((r) => ({
    rule: text(r["Rule / stage"]),
    description: text(r["Description"]),
    value: text(r["Starting value"]),
    unit: text(r["Unit"]),
    status: text(r["Status"]),
    notes: text(r["Notes / review needed"]),
  }));

  const now = timingRules.find((r) => r.rule === "Simulated now");
  const clock = /Day -?\d+ \d{2}:\d{2}/.exec(now?.value ?? "")?.[0];
  if (!clock) throw new Error('Timing Rules: "Simulated now" clock not found');

  return {
    meta: { source: basename(path), clock, simulated: true, ...parseOverview(wb) },
    cases,
    blocks,
    slides,
    events,
    timingRules,
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const [input = DEFAULT_IN, output = DEFAULT_OUT] = process.argv.slice(2);
  const data = convertWorkbook(input);
  writeFileSync(output, JSON.stringify(data, null, 2) + "\n");
  console.log(
    `Wrote ${output}: ${data.cases.length} cases, ${data.blocks.length} blocks, ${data.slides.length} slides, ${data.events.length} events, ${data.timingRules.length} timing rules`,
  );
}
