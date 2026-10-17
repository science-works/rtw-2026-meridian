// Handoff estimate: remaining required steps × configured durations, placed in working
// windows. Queues and parallel capacity are not modelled. Anything missing → "unknown".
import { CLOCK_MINUTES, formatSimTime, parseSimTime } from "../../../shared/clock";
import { generic } from "../../../shared/labels";
import type { Alert, CaseRecord, CellpathData, Estimate, EstimateComponent, EventRecord } from "../../../shared/types";
import type { Targets } from "../targets";
import { parseRules, type Rules, type Window } from "./rules";

export interface EstimateContext {
  data: CellpathData;
  alerts: Alert[];
  targets: Targets;
}

export const BASE_ASSUMPTIONS = [
  "Queues and parallel capacity not modelled",
  "Illustrative timing rules from the workbook's Timing Rules tab",
  "Staffed steps run 07:00–17:00; scanning can run overnight",
];
export const BACKGROUND_ASSUMPTION = "Illustrative, stage-based estimate (limited event history)";
const ELAPSED_NOTE = "configured duration already elapsed; treated as finishing now";

class Unknown extends Error {}
const need = (v: number | null, what: string): number => {
  if (v === null) throw new Unknown(`${what} duration not configured`);
  return v;
};

const tod = (t: number) => ((t % 1440) + 1440) % 1440;
const dayOf = (t: number) => Math.floor(t / 1440);

/** Moves t to the next moment inside the staffed window. */
function intoWindow(t: number, w: Window): number {
  const day = dayOf(t);
  if (tod(t) < w.start) return day * 1440 + w.start;
  if (tod(t) >= w.end) return (day + 1) * 1440 + w.start;
  return t;
}

/** Adds working minutes, spilling past the window end into the next day. */
function addStaffed(t: number, minutes: number, w: Window): number {
  let cur = intoWindow(t, w);
  let left = minutes;
  while (left > 0) {
    const room = dayOf(cur) * 1440 + w.end - cur;
    if (left <= room) return cur + left;
    left -= room;
    cur = (dayOf(cur) + 1) * 1440 + w.start;
  }
  return cur;
}

function levelsPerBlock(levelsRequired: number) {
  return Math.max(levelsRequired, 1);
}

function unknownReason(c: CaseRecord, alerts: Alert[], rules: Rules): string | null {
  const strip = (a: Alert) => {
    const s = a.what.replace(`${c.caseId}: `, "").replace(new RegExp(`^${c.caseId} `), "");
    return s.charAt(0).toUpperCase() + s.slice(1);
  };
  for (const a of alerts) {
    if (a.kind === "outstanding_block") return `No reliable whole-case estimate: ${strip(a)}. Whole-case handoff waits for every required block.`;
    if (a.kind === "protocol_mismatch") return `${strip(a)}; staff review is needed before the case advances.`;
    if (a.kind === "scan_gap") return "Missing scan event; scan status unknown until the slide location or scan record is checked.";
  }
  if (c.stageSnapshot === "Decalcification" && rules.decalcification === null)
    return "Decalcification has no configured duration (a normal, longer-running step).";
  if (c.stageSnapshot === "Waiting for dissection/cut-up") return "Pathologist cut-up time is not recorded or configured.";
  if (c.stageSnapshot === "Received/booked") return "Cut-up duration is not configured and no processor is assigned yet.";
  return null;
}

function estimateCase(c: CaseRecord, ctx: EstimateContext, rules: Rules, events: EventRecord[]): Estimate {
  const now = CLOCK_MINUTES;
  const alerts = ctx.alerts.filter((a) => a.caseIds.includes(c.caseId));
  const blocks = ctx.data.blocks.filter((b) => b.caseId === c.caseId);
  const slides = ctx.data.slides.filter((s) => s.caseId === c.caseId);
  const latest = (type: string) => {
    const ts = events.filter((e) => e.type === type).map((e) => parseSimTime(e.at));
    return ts.length ? Math.max(...ts) : null;
  };
  const entered = parseSimTime(c.stageEnteredAt);
  const assumptions = [...BASE_ASSUMPTIONS, ...(c.isDemo ? [] : [BACKGROUND_ASSUMPTION])];

  if (c.stageSnapshot === "Ready for pathologist handoff") {
    return { status: "ready", readyAt: formatSimTime(latest("CASE_READY_FOR_PATHOLOGIST") ?? entered), components: [], assumptions: [] };
  }
  const reason = unknownReason(c, alerts, rules);
  if (reason) return { status: "unknown", components: [], assumptions: [], reasonUnknown: reason };

  try {
    const staffed = rules.staffed ?? (() => { throw new Unknown("Staffed working window not configured"); })();
    const components: EstimateComponent[] = [];
    let active = 0;
    let t = now;
    const order = ["Awaiting processor or processing", "Embedding", "Microtomy", "H&E staining", "Scanning", "IQC"] as const;
    const from = order.indexOf(c.stageSnapshot as (typeof order)[number]);
    if (from < 0) throw new Unknown(`No estimate rule for stage "${c.stageSnapshot}"`);
    const at = (stage: (typeof order)[number]) => from <= order.indexOf(stage);
    const finish = (end: number) => (end < now ? { end: now, late: true } : { end, late: false });
    const push = (step: string, minutes: number | undefined, ruleId: string, note?: string, counts = true) => {
      components.push({ step, ...(minutes !== undefined ? { minutes } : {}), ruleId: generic(ruleId), ...(note ? { note } : {}) });
      if (counts && minutes !== undefined) active += minutes;
    };

    const nSlides = slides.length || blocks.reduce((n, b) => n + levelsPerBlock(b.levelsRequired), 0);
    if (!slides.length) assumptions.push("Slide count estimated from required levels (one per block when not specified)");

    // 1. Overnight processing: output on the next morning at the processor's configured time.
    if (c.stageSnapshot === "Awaiting processor or processing") {
      const proc = c.processor && rules.processorOutput[c.processor];
      if (!proc) throw new Unknown("Processor output time not configured for this case");
      const cutoff = need(rules.cutoff, "Processor loading cutoff");
      const loaded = latest("PROCESSOR_LOADED") ?? entered;
      const runDay = dayOf(loaded) + (tod(loaded) > cutoff ? 1 : 0);
      t = (runDay + 1) * 1440 + proc.minutes;
      if (t < now) throw new Unknown("Processor output time has passed with no completion event recorded");
      push(`Overnight processing on ${generic(c.processor!)}`, undefined, c.processor!, `output expected ${formatSimTime((runDay + 1) * 1440).slice(0, -6)} ${proc.display}`);
    }

    // 2. Embedding: a batch in the morning window (upper bound of the configured range).
    if (at("Embedding")) {
      const emb = rules.embedding ?? (() => { throw new Unknown("Embedding duration not configured"); })();
      let start: number;
      let note = `${emb.display} batch; upper bound used`;
      if (c.stageSnapshot === "Embedding") start = latest("EMBEDDING_STARTED") ?? entered;
      else {
        start = tod(t) < emb.window.start ? dayOf(t) * 1440 + emb.window.start : t;
        if (tod(start) > emb.window.end) {
          note += "; embedding window missed, next available slot not modelled";
          assumptions.push("Next available embedding slot not modelled");
        }
      }
      const f = finish(start + emb.minutes);
      push("Embedding", emb.minutes, "Embedding", f.late ? `${note}; ${ELAPSED_NOTE}` : note, false);
      t = f.end;
    }

    // 3. Microtomy: per block, plus extra levels. Skipped when every required level is recorded.
    if (at("Microtomy")) {
      const allCut = slides.length > 0 && blocks.every((b) => b.levelsRecorded >= levelsPerBlock(b.levelsRequired));
      if (c.stageSnapshot === "Microtomy" && allCut) {
        t = Math.max(now, latest("LEVELS_CUT") ?? entered);
        push("Microtomy", undefined, "Microtomy routine cut", "all required levels recorded");
      } else {
        const perBlock = need(rules.microtomyPerBlock, "Microtomy");
        const perLevel = need(rules.microtomyPerExtraLevel, "Microtomy extra level");
        const levels = blocks.reduce((n, b) => n + levelsPerBlock(b.levelsRequired), 0);
        const minutes = blocks.reduce((n, b) => n + perBlock + perLevel * (levelsPerBlock(b.levelsRequired) - 1), 0);
        t = addStaffed(Math.max(t, now), minutes, staffed);
        push(`Microtomy (${blocks.length} block${blocks.length === 1 ? "" : "s"}, ${levels} level${levels === 1 ? "" : "s"})`, minutes, "Microtomy routine cut");
      }
    }

    // 4. H&E staining run, plus the repeat run when the basket failed.
    if (at("H&E staining")) {
      const run = need(rules.stainRun, "H&E run");
      const start = c.stageSnapshot === "H&E staining" ? (latest("BASKET_LOADED") ?? entered) : intoWindow(t, staffed);
      const f = finish(start + run);
      push("H&E staining run", run, "Prisma H&E run", f.late ? ELAPSED_NOTE : undefined);
      t = f.end;
      if (alerts.some((a) => a.kind === "basket_failure")) {
        const repeat = need(rules.repeatStain, "Repeat stain");
        t = intoWindow(t, staffed) + repeat;
        push("Repeat H&E run (failed basket)", repeat, "Prisma repeat stain");
      }
    }

    // 5. Scanning: per slide, any hour.
    if (at("Scanning")) {
      const per = need(rules.scanPerSlide, "Scan");
      const remaining = Math.max(nSlides - events.filter((e) => e.type === "SCAN_COMPLETE").length, 0);
      if (remaining > 0) {
        const f = c.stageSnapshot === "Scanning" ? finish(entered + remaining * per) : { end: t + remaining * per, late: false };
        push(`Digital scan (${remaining} slide${remaining === 1 ? "" : "s"})`, remaining * per, "Digital scanners", f.late ? ELAPSED_NOTE : undefined);
        t = f.end;
      }
    }

    // 6. IQC, then case completion and handoff, all in staffed hours.
    const iqc = need(rules.iqcPerSlide, "IQC") * nSlides;
    if (c.stageSnapshot === "IQC") {
      const f = finish(addStaffed(latest("IQC_STARTED") ?? entered, iqc, staffed));
      push(`IQC (${nSlides} slides)`, iqc, "IQC slide review", f.late ? ELAPSED_NOTE : undefined);
      t = f.end;
    } else {
      t = addStaffed(t, iqc, staffed);
      push(`IQC (${nSlides} slides)`, iqc, "IQC slide review");
    }
    for (const [step, value, rule] of [
      ["Case completion", rules.completion, "Case completion / emit"],
      ["Physical handoff to pathologist tray", rules.physicalHandoff, "Physical case handoff"],
      ["Digital image send", rules.digitalSend, "Digital image send"],
    ] as const) {
      const m = need(value, step);
      t = addStaffed(t, m, staffed);
      push(step, m, rule);
    }

    return { status: "estimated", readyAt: formatSimTime(t), activeMinutes: active, wallClockMinutes: t - now, components, assumptions };
  } catch (e) {
    if (e instanceof Unknown) return { status: "unknown", components: [], assumptions: [], reasonUnknown: `${e.message}.` };
    throw e;
  }
}

function withTarget(c: CaseRecord, e: Estimate, ctx: EstimateContext, rules: Rules, events: EventRecord[]): Estimate {
  const category = c.priority === "Urgent" ? "urgent" : c.programmeTag ? "screening" : "routine";
  const hours = ctx.targets[category];
  const received = events.find((x) => x.type === "CASE_RECEIVED");
  if (hours === null || !received || !rules.staffed) return { ...e, target: "target comparison unavailable" };
  const due = addStaffed(parseSimTime(received.at), hours * 60, rules.staffed);
  const compareAt = e.readyAt ? parseSimTime(e.readyAt) : CLOCK_MINUTES;
  const label = `${category.charAt(0).toUpperCase()}${category.slice(1)}: ${hours} working hours`;
  return { ...e, target: { label, dueAt: formatSimTime(due), late: compareAt > due } };
}

/** Estimates for every case, keyed by case ID. Deterministic; reads recorded events only. */
export function estimateAll(ctx: EstimateContext): Map<string, Estimate> {
  const rules = parseRules(ctx.data.timingRules);
  const byCase = new Map<string, EventRecord[]>();
  for (const e of ctx.data.events) if (e.activation === "Recorded") byCase.set(e.caseId, [...(byCase.get(e.caseId) ?? []), e]);
  const out = new Map<string, Estimate>();
  for (const c of ctx.data.cases) {
    const events = byCase.get(c.caseId) ?? [];
    out.set(c.caseId, withTarget(c, estimateCase(c, ctx, rules, events), ctx, rules, events));
  }
  return out;
}
