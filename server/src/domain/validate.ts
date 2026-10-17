import { CLOCK_MINUTES, formatSimTime, parseSimTime } from "../../../shared/clock";
import { STAGES } from "../../../shared/types";
import type { CellpathData, EventRecord, OverviewStageRow } from "../../../shared/types";
import { INCIDENT } from "./incident";

export interface ValidationError {
  code: string;
  message: string;
}

export interface ValidationResult {
  ok: boolean;
  errors: ValidationError[];
  counts: {
    cases: number;
    backlog: number;
    today: number;
    blocks: number;
    slides: number;
    events: number;
    stages: OverviewStageRow[];
    latestEventAt: string | null;
  };
}


/** [earlier, later]: within a case, every `later` event must not precede the last `earlier` event. */
export const EVENT_ORDER: [string, string][] = [
  ["EMBEDDING_COMPLETE", "LEVELS_CUT"],
  ["LEVELS_CUT", "BASKET_LOADED"],
  ["STAINING_COMPLETE", "SCAN_COMPLETE"],
  ["SCAN_COMPLETE", "IQC_PASSED"],
  ["STAINING_COMPLETE", "IQC_PASSED"],
  ["PROCESSOR_COMPLETE", "EMBEDDING_STARTED"],
  ["MICROTOMY_STARTED", "LEVELS_CUT"],
];

const blockKey = (caseId: string, blockId: string) => `${caseId}/${blockId}`;

function duplicates(ids: string[]): string[] {
  const seen = new Set<string>();
  const dups = new Set<string>();
  for (const id of ids) (seen.has(id) ? dups : seen).add(id);
  return [...dups];
}

function groupBy<T>(items: T[], key: (t: T) => string): Map<string, T[]> {
  const m = new Map<string, T[]>();
  for (const t of items) {
    const k = key(t);
    const list = m.get(k);
    if (list) list.push(t);
    else m.set(k, [t]);
  }
  return m;
}

/** Deterministic checks that the converted dataset is internally consistent. Never mutates `data`. */
export function validate(data: CellpathData): ValidationResult {
  const errors: ValidationError[] = [];
  const fail = (code: string, message: string) => errors.push({ code, message });

  // --- uniqueness ---
  for (const id of duplicates(data.cases.map((c) => c.caseId))) fail("duplicate_case", `Duplicate case ${id}`);
  for (const id of duplicates(data.blocks.map((b) => blockKey(b.caseId, b.blockId)))) fail("duplicate_block", `Duplicate block ${id}`);
  for (const id of duplicates(data.slides.map((s) => s.slideId))) fail("duplicate_slide", `Duplicate slide ${id}`);
  for (const id of duplicates(data.events.map((e) => e.eventId))) fail("duplicate_event", `Duplicate event ${id}`);

  // --- counts reconcile with the Overview tab ---
  const backlog = data.cases.filter((c) => c.cohort === "Previous-day backlog").length;
  const today = data.cases.filter((c) => c.cohort === "Current-day workload").length;
  const t = data.meta.overviewTotals;
  if (data.cases.length !== t.total || backlog !== t.backlog || today !== t.today) {
    fail("cohort_counts", `Cases ${data.cases.length} = ${backlog} backlog + ${today} today; Overview says ${t.total} = ${t.backlog} + ${t.today}`);
  }
  const stages: OverviewStageRow[] = STAGES.map((stage) => {
    const inStage = data.cases.filter((c) => c.stageSnapshot === stage);
    const b = inStage.filter((c) => c.cohort === "Previous-day backlog").length;
    return { stage, backlog: b, today: inStage.length - b, total: inStage.length };
  });
  for (const row of stages) {
    const want = data.meta.overviewStages.find((s) => s.stage === row.stage);
    if (!want || want.backlog !== row.backlog || want.today !== row.today || want.total !== row.total) {
      fail("stage_counts", `${row.stage}: computed ${row.backlog}+${row.today}=${row.total}, Overview ${want ? `${want.backlog}+${want.today}=${want.total}` : "missing"}`);
    }
  }
  const ready = stages.find((s) => s.stage === "Ready for pathologist handoff")!.total;
  if (ready !== t.ready) fail("stage_counts", `Ready: computed ${ready}, Overview ${t.ready}`);

  // --- links resolve ---
  const caseById = new Map(data.cases.map((c) => [c.caseId, c]));
  const blockKeys = new Set(data.blocks.map((b) => blockKey(b.caseId, b.blockId)));
  const slideById = new Map(data.slides.map((s) => [s.slideId, s]));
  for (const b of data.blocks) if (!caseById.has(b.caseId)) fail("block_case_link", `Block ${b.blockId} → unknown case ${b.caseId}`);
  for (const s of data.slides) {
    if (!caseById.has(s.caseId)) fail("slide_case_link", `Slide ${s.slideId} → unknown case ${s.caseId}`);
    if (!blockKeys.has(blockKey(s.caseId, s.blockId))) fail("slide_block_link", `Slide ${s.slideId} → unknown block ${s.caseId}/${s.blockId}`);
  }
  for (const e of data.events) {
    if (!caseById.has(e.caseId)) fail("event_case_link", `${e.eventId} → unknown case ${e.caseId}`);
    if (e.blockId && !blockKeys.has(blockKey(e.caseId, e.blockId))) fail("event_block_link", `${e.eventId} → unknown block ${e.caseId}/${e.blockId}`);
    if (e.slideId && slideById.get(e.slideId)?.caseId !== e.caseId) fail("event_slide_link", `${e.eventId} → unknown slide ${e.slideId} for ${e.caseId}`);
  }

  // --- per-case block and slide counts ---
  const blocksByCase = groupBy(data.blocks, (b) => b.caseId);
  const slidesByCase = groupBy(data.slides, (s) => s.caseId);
  for (const c of data.cases) {
    const nb = blocksByCase.get(c.caseId)?.length ?? 0;
    const ns = slidesByCase.get(c.caseId)?.length ?? 0;
    if (nb !== c.blocksExpected) fail("block_count", `${c.caseId}: ${nb} blocks listed, ${c.blocksExpected} expected`);
    if (ns !== c.slidesInCase) fail("slide_count", `${c.caseId}: ${ns} slides listed, ${c.slidesInCase} in case row`);
  }

  // --- times: parseable and not after the clock ---
  const minutes = new Map<EventRecord, number>();
  for (const e of data.events) {
    try {
      const m = parseSimTime(e.at);
      minutes.set(e, m);
      if (m > CLOCK_MINUTES) fail("event_after_clock", `${e.eventId} at ${e.at} is after the clock ${data.meta.clock}`);
    } catch {
      fail("bad_time", `${e.eventId} has an unreadable time "${e.at}"`);
    }
  }
  const timed = data.events.filter((e) => minutes.has(e));
  const time = (e: EventRecord) => minutes.get(e)!;

  // --- receipt and event order within each case ---
  const eventsByCase = groupBy(timed, (e) => e.caseId);
  for (const c of data.cases) {
    const evs = eventsByCase.get(c.caseId) ?? [];
    const receipts = evs.filter((e) => e.type === "CASE_RECEIVED");
    if (receipts.length === 0) {
      fail("missing_receipt", `${c.caseId} has no CASE_RECEIVED event`);
    } else {
      const received = Math.min(...receipts.map(time));
      for (const e of evs) if (time(e) < received) fail("event_before_receipt", `${e.eventId} (${e.type}) precedes receipt of ${c.caseId}`);
    }
    for (const [earlier, later] of EVENT_ORDER) {
      const a = evs.filter((e) => e.type === earlier).map(time);
      const b = evs.filter((e) => e.type === later).map(time);
      if (a.length && b.length && Math.min(...b) < Math.max(...a)) fail("event_order", `${c.caseId}: ${later} before ${earlier}`);
    }

    // The latest event is the source of truth; it must agree with the snapshot.
    const latest = evs.reduce<EventRecord | null>(
      (best, e) => (!best || time(e) > time(best) || (time(e) === time(best) && e.eventId > best.eventId) ? e : best),
      null,
    );
    if (latest && latest.stage !== c.stageSnapshot) {
      fail("snapshot_mismatch", `${c.caseId}: latest event ${latest.eventId} says "${latest.stage}", snapshot says "${c.stageSnapshot}"`);
    }
  }

  // --- the recorded H&E incident is complete (it is staged for replay by the server) ---
  for (const { id, type } of Object.values(INCIDENT)) {
    const e = data.events.find((x) => x.eventId === id);
    if (!e || e.type !== type) fail("incident_events", `Expected ${id} ${type}; found ${e ? e.type : "none"}`);
  }

  // --- staff initials: fictional AA/BB, embedding only ---
  for (const e of data.events) {
    if (e.initials && (!["AA", "BB"].includes(e.initials) || !/^Embedding station \d$/.test(e.station ?? ""))) {
      fail("initials", `${e.eventId}: initials "${e.initials}" at "${e.station}"`);
    }
  }

  // --- no slides for cases that have not reached microtomy (spec §10) ---
  const preMicrotomy = new Set(["Received/booked", "Waiting for dissection/cut-up", "Awaiting processor or processing", "Decalcification", "Embedding"]);
  for (const s of data.slides) {
    const c = caseById.get(s.caseId);
    if (c && preMicrotomy.has(c.stageSnapshot)) fail("slide_before_microtomy", `${s.slideId} exists but ${c.caseId} is at ${c.stageSnapshot}`);
  }

  const latestMinute = timed.length ? Math.max(...timed.map(time)) : null;
  return {
    ok: errors.length === 0,
    errors,
    counts: {
      cases: data.cases.length,
      backlog,
      today,
      blocks: data.blocks.length,
      slides: data.slides.length,
      events: data.events.length,
      stages,
      latestEventAt: latestMinute === null ? null : formatSimTime(latestMinute),
    },
  };
}
