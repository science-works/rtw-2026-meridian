// The lab-flow map (spec Screen B): which cases and blocks are at which zone or piece of
// equipment, from recorded stages, block locations and station events. Where the data does
// not record a unit (most microtomy and scanning work), cases wait in a queue card instead
// of being assigned to a station. Nothing here is invented.
import { formatSimTime, parseSimTime } from "../../../shared/clock";
import { displayText, generic, stationParts } from "../../../shared/labels";
import type { Alert, CaseRecord, CellpathData, EventRecord, StationCard, WaitingReason } from "../../../shared/types";
import { blockRange } from "./alerts";
import { byTime } from "./incident";
import { parseRules } from "./rules";

const hhmm = (at: string) => at.slice(-5);

function latestOf(events: EventRecord[]): EventRecord | undefined {
  return [...events].sort(byTime).at(-1);
}

/** Station activity: the 11:30 stage-snapshot rows are a reconciliation record, not work at a station. */
const activity = (events: EventRecord[]) => events.filter((e) => e.type !== "CURRENT_STAGE_SNAPSHOT");

const ev = (e: EventRecord | undefined) => (e ? { eventId: e.eventId, at: e.at, text: displayText(e.details) } : undefined);

export function computeStations(data: CellpathData, alerts: Alert[]): StationCard[] {
  const rules = parseRules(data.timingRules);
  const byStage = (stage: string) => data.cases.filter((c) => c.stageSnapshot === stage);
  const eventsByCase = new Map<string, EventRecord[]>();
  for (const e of data.events) eventsByCase.set(e.caseId, [...(eventsByCase.get(e.caseId) ?? []), e]);
  const blocksOf = (id: string) => data.blocks.filter((b) => b.caseId === id);
  const slidesOf = (id: string) => data.slides.filter((s) => s.caseId === id);
  const count = (ids: string[]) => ({ blocks: ids.reduce((n, id) => n + blocksOf(id).length, 0), slides: ids.reduce((n, id) => n + slidesOf(id).length, 0) });
  const atLabel = (label: string) => data.events.filter((e) => generic(e.station) === label);

  /** Equipment number for a case: block location first, then the latest event at such a unit. */
  const unitOf = (c: CaseRecord, re: RegExp): number | null => {
    for (const b of blocksOf(c.caseId)) {
      const m = re.exec(generic(b.location) ?? "");
      if (m) return Number(m[1]);
    }
    const e = latestOf((eventsByCase.get(c.caseId) ?? []).filter((x) => re.test(generic(x.station) ?? "")));
    const m = e ? re.exec(generic(e.station) ?? "") : null;
    return m ? Number(m[1]) : null;
  };

  const cards: StationCard[] = [];
  const ids = (cs: CaseRecord[]) => cs.map((c) => c.caseId);

  // 1. Reception / dissection
  const reception = [...byStage("Received/booked"), ...byStage("Waiting for dissection/cut-up")];
  cards.push({
    id: "reception",
    label: "Reception / dissection",
    zone: "Reception / dissection",
    kind: "zone",
    state: `${byStage("Received/booked").length} received · ${byStage("Waiting for dissection/cut-up").length} awaiting pathologist cut-up`,
    caseIds: ids(reception),
    ...count(ids(reception)),
    nextMilestone: { text: `Cut-up complete; loaded for the overnight run before ${rules.cutoff !== null ? formatSimTime(rules.cutoff).slice(-5) : "the cutoff"}`, rule: "Timing Rules: Processor loading cutoff" },
  });

  // 2. Decalcification holding (normal work; no fixed duration)
  const decal = byStage("Decalcification");
  cards.push({
    id: "decal",
    label: "Decalcification holding",
    zone: "Decalcification holding",
    kind: "zone",
    state: "Normal longer-running step",
    caseIds: ids(decal),
    ...count(ids(decal)),
    nextMilestone: { text: "A recorded 'ready for processing' event (no fixed decalcification duration)", rule: "Timing Rules: Decalcification" },
  });

  // 3. Processors A–D: processing-stage cases by recorded processor, plus blocks located there
  for (const letter of ["A", "B", "C", "D"]) {
    const label = `Processor ${letter}`;
    const cases = byStage("Awaiting processor or processing").filter((c) => c.processor === label);
    const split = data.cases.filter((c) => !cases.includes(c) && blocksOf(c.caseId).some((b) => generic(b.location) === label));
    const items = split.map((c) => `${c.caseId} · ${blockRange(blocksOf(c.caseId).filter((b) => generic(b.location) === label).map((b) => b.blockId))}`);
    const caseIds = [...ids(cases), ...ids(split)];
    const blocks = cases.reduce((n, c) => n + blocksOf(c.caseId).length, 0) + split.reduce((n, c) => n + blocksOf(c.caseId).filter((b) => generic(b.location) === label).length, 0);
    const out = rules.processorOutput[label];
    const loadedToday = caseIds.some((id) => (eventsByCase.get(id) ?? []).some((e) => e.type === "PROCESSOR_LOADED" && generic(e.station) === label && parseSimTime(e.at) < 1440));
    cards.push({
      id: `processor-${letter.toLowerCase()}`,
      label,
      zone: "Processors",
      kind: "processor",
      state: out ? `Overnight run · output expected ${out.display}` : "Output time not configured",
      caseIds,
      ...(items.length ? { items } : {}),
      blocks,
      slides: 0,
      load: `${caseIds.length} case${caseIds.length === 1 ? "" : "s"} · ${blocks} block${blocks === 1 ? "" : "s"}; slot capacity not specified`,
      latestEvent: ev(latestOf(activity(atLabel(label)).filter((e) => caseIds.includes(e.caseId)))),
      nextMilestone: out
        ? { text: `Output ${loadedToday ? "today (Day 1)" : "tomorrow (Day 2)"} ~${out.display}`, rule: `Timing Rules: ${label}` }
        : { text: "Not enough information: output time not configured" },
    });
  }

  // 4. Embedding stations 1–2 (fictional initials shown for traceability only)
  const embedding = byStage("Embedding");
  for (const n of [1, 2]) {
    const label = `Embedding station ${n}`;
    const cases = embedding.filter((c) => unitOf(c, /^Embedding station (\d)$/) === n);
    const initials = atLabel(label)
      .filter((e) => e.initials)
      .sort(byTime)
      .map((e) => ({ at: e.at, initials: e.initials!, eventId: e.eventId, caseId: e.caseId }));
    cards.push({
      id: `embedding-${n}`,
      label,
      zone: "Embedding",
      kind: "embedding",
      state: `Main staffed window ${rules.embedding ? `${formatSimTime(rules.embedding.window.start).slice(-5)}–${formatSimTime(rules.embedding.window.end).slice(-5)}` : "not configured"}`,
      caseIds: ids(cases),
      ...count(ids(cases)),
      load: `${cases.length} case${cases.length === 1 ? "" : "s"}`,
      latestEvent: ev(latestOf(activity(atLabel(label)))),
      nextMilestone: { text: `Embedding complete (${rules.embedding?.display ?? "duration not configured"} batch)`, rule: "Timing Rules: Embedding" },
      initials,
    });
  }
  const embedQueue = embedding.filter((c) => unitOf(c, /^Embedding station (\d)$/) === null);
  if (embedQueue.length) {
    cards.push({ id: "embedding-queue", label: "Embedding (station not recorded)", zone: "Embedding", kind: "queue", state: `${embedQueue.length} cases`, caseIds: ids(embedQueue), ...count(ids(embedQueue)) });
  }

  // 5. Microtomy stations 1–6, plus the queue for cases with no recorded station
  const microtomy = byStage("Microtomy");
  const cutRule = { text: `Levels cut: ${rules.microtomyPerBlock ?? "?"} min per block + ${rules.microtomyPerExtraLevel ?? "?"} min per extra level`, rule: "Timing Rules: Microtomy routine cut" };
  for (const n of [1, 2, 3, 4, 5, 6]) {
    const label = `Microtomy station ${n}`;
    const cases = microtomy.filter((c) => unitOf(c, /^Microtomy station (\d)$/) === n);
    cards.push({
      id: `microtomy-${n}`,
      label,
      zone: "Microtomy",
      kind: "microtomy",
      state: cases.length ? `Cutting ${ids(cases).join(", ")}` : "No case recorded here now",
      caseIds: ids(cases),
      ...count(ids(cases)),
      load: `${cases.length} case${cases.length === 1 ? "" : "s"}`,
      latestEvent: ev(latestOf(activity(atLabel(label)))),
      nextMilestone: cutRule,
    });
  }
  const microQueue = microtomy.filter((c) => unitOf(c, /^Microtomy station (\d)$/) === null);
  cards.push({
    id: "microtomy-queue",
    label: "Microtomy queue",
    zone: "Microtomy",
    kind: "queue",
    state: `${microQueue.filter((c) => c.cohort === "Previous-day backlog").length} previous-day backlog · ${microQueue.filter((c) => c.cohort !== "Previous-day backlog").length} today`,
    caseIds: ids(microQueue),
    ...count(ids(microQueue)),
    load: `${microQueue.length} cases waiting; station not recorded`,
    nextMilestone: cutRule,
  });

  // 6. H&E auto-stainer 1: 3 boxes × 3 baskets × 20 slides
  const he = byStage("H&E staining");
  const heIds = new Set(ids(he));
  const failure = alerts.find((a) => a.kind === "basket_failure");
  const basketIds = [...new Set(data.slides.filter((s) => s.basket && heIds.has(s.caseId)).map((s) => s.basket!))];
  const baskets = [1, 2, 3].flatMap((box) =>
    [1, 2, 3].map((basket) => {
      // Basket IDs are numbered across the stainer: H&E-BASKET-01 is Box 1 / Basket 1 (as the workbook's incident event records).
      const basketId = basketIds.find((b) => {
        const m = /-BASKET-(\d+)$/.exec(b);
        return m && Number(m[1]) === (box - 1) * 3 + basket;
      });
      const slides = basketId ? data.slides.filter((s) => s.basket === basketId) : [];
      const caseIds = [...new Set(slides.map((s) => s.caseId))].sort();
      let state = "Empty (none recorded)";
      if (basketId) {
        const loaded = data.events.filter((e) => e.type === "BASKET_LOADED" && slides.some((s) => s.slideId === e.slideId)).sort(byTime)[0];
        state = loaded ? `Loaded ${hhmm(loaded.at)}` : "Loaded (time not recorded)";
        if (failure && failure.id === `basket_failure:${basketId}`) {
          const at = (label: string) => failure.history.find((h) => h.label === label)?.at;
          const repeat = at("Repeat H&E run started");
          state =
            failure.state === "resolved"
              ? "Repeat run complete"
              : repeat
                ? `Repeat stain in progress (started ${hhmm(repeat)})`
                : failure.state === "in_progress"
                  ? (failure.stateDetail ?? "In progress")
                  : failure.state === "acknowledged"
                    ? `Acknowledged ${hhmm(at("Acknowledged")!)}`
                    : `Run failed ${hhmm(failure.raisedAt)}`;
        }
      }
      return { box, basket, ...(basketId ? { basketId } : {}), slides: slides.length, caseIds, state };
    }),
  );
  const inBaskets = baskets.reduce((n, b) => n + b.slides, 0);
  const unbasketed = he.filter((c) => !baskets.some((b) => b.caseIds.includes(c.caseId)));
  cards.push({
    id: "stainer-1",
    label: "H&E auto-stainer 1",
    zone: "H&E",
    kind: "stainer",
    state: baskets.find((b) => b.basketId && failure?.id === `basket_failure:${b.basketId}`)?.state ?? `${rules.stainRun ?? "?"}-minute run · 9 baskets × 20 slides`,
    caseIds: ids(he),
    ...(unbasketed.length ? { items: [`${unbasketed.length} cases at H&E with no basket recorded`] } : {}),
    ...count(ids(he)),
    load: `${inBaskets} of 180 slide slots recorded in baskets`,
    latestEvent: ev(latestOf(activity(atLabel("H&E auto-stainer 1")).filter((e) => heIds.has(e.caseId)))),
    nextMilestone: { text: `H&E run complete (${rules.stainRun ?? "?"} min per run)`, rule: "Timing Rules: H&E auto-stainer run" },
    baskets,
  });

  // 7. Digital scanners 1–2 (~100 slots each), plus the queue for cases with no recorded unit
  const scanning = byStage("Scanning");
  for (const n of [1, 2]) {
    const label = `Digital scanner ${n}`;
    const cases = scanning.filter((c) => unitOf(c, /^Digital scanner (\d)$/) === n);
    const slides = count(ids(cases)).slides;
    cards.push({
      id: `scanner-${n}`,
      label,
      zone: "Scanning",
      kind: "scanner",
      state: cases.length ? `Scanning ${ids(cases).join(", ")}` : "No current scan recorded",
      caseIds: ids(cases),
      ...count(ids(cases)),
      load: `${slides} of 100 slide slots in use (recorded)`,
      latestEvent: ev(latestOf(activity(atLabel(label)))),
      nextMilestone: { text: `Scan complete: ${rules.scanPerSlide ?? "?"} min per slide (illustrative)`, rule: "Timing Rules: Digital scanners" },
    });
  }
  const scanQueue = scanning.filter((c) => unitOf(c, /^Digital scanner (\d)$/) === null);
  const queueSlides = scanQueue.reduce((n, c) => n + Math.max(slidesOf(c.caseId).length, c.slidesInCase), 0);
  cards.push({
    id: "scanner-queue",
    label: "Scanner queue (unit not recorded)",
    zone: "Scanning",
    kind: "queue",
    state: `${scanQueue.length} cases · ${queueSlides} slides`,
    caseIds: ids(scanQueue),
    ...count(ids(scanQueue)),
    load: `${queueSlides} slides waiting; 2 units × ~100 slots`,
    nextMilestone: {
      text: `Scan complete: ${rules.scanPerSlide ?? "?"} min per slide (${queueSlides} slides ≈ ${queueSlides * (rules.scanPerSlide ?? 0)} min of scanning; parallel capacity not modelled)`,
      rule: "Timing Rules: Digital scanners",
    },
  });

  // 8. IQC workstation 1
  const iqc = byStage("IQC");
  cards.push({
    id: "iqc-1",
    label: "IQC workstation 1",
    zone: "IQC",
    kind: "iqc",
    state: `${iqc.length} case${iqc.length === 1 ? "" : "s"} in review`,
    caseIds: ids(iqc),
    ...count(ids(iqc)),
    load: `${count(ids(iqc)).slides} slides recorded`,
    latestEvent: ev(latestOf(activity(atLabel("IQC workstation 1")))),
    nextMilestone: { text: `IQC passed: ${rules.iqcPerSlide ?? "?"} min per slide (match image, slide and request form)`, rule: "Timing Rules: IQC slide review" },
  });

  // 9. Pathologist handoff: physical tray and digital send shown separately
  const ready = byStage("Ready for pathologist handoff");
  const sent = ready.filter((c) => (eventsByCase.get(c.caseId) ?? []).some((e) => e.type === "CASE_READY_FOR_PATHOLOGIST")).length;
  cards.push({
    id: "handoff",
    label: "Pathologist handoff",
    zone: "Pathologist handoff",
    kind: "zone",
    state: `${ready.length} ready for the pathologist`,
    caseIds: ids(ready),
    ...count(ids(ready)),
    handoff: {
      digital: `Digital send recorded for ${sent} of ${ready.length} (case emitted event)`,
      physical: "Physical tray / pigeonhole: not recorded separately in this dataset",
    },
    latestEvent: ev(latestOf(data.events.filter((e) => e.type === "CASE_READY_FOR_PATHOLOGIST"))),
  });

  return cards;
}

const NEXT_BY_STAGE: Record<string, string> = {
  "Received/booked": "Cut-up not yet recorded",
  "Waiting for dissection/cut-up": "Pathologist cut-up not yet recorded",
  "Awaiting processor or processing": "Processor output not yet recorded",
  Decalcification: "Ready for processing not yet recorded (decalcification has no fixed duration)",
  Embedding: "Embedding complete not yet recorded",
  Microtomy: "Levels cut not yet recorded",
  "H&E staining": "H&E staining complete not yet recorded",
  Scanning: "Scan complete not yet recorded",
  IQC: "IQC passed not yet recorded",
};

/** "Why is it waiting?": the latest recorded event and the missing next event (spec Screen C). */
export function whyWaiting(data: CellpathData, caseId: string): WaitingReason {
  const c = data.cases.find((x) => x.caseId === caseId);
  if (!c) return { latest: null, missing: "Not enough information: case not found" };
  const evs = data.events.filter((e) => e.caseId === caseId);
  const latest = latestOf(evs);
  const latestOut = latest ? { eventId: latest.eventId, at: latest.at, text: displayText(latest.details) } : null;
  if (c.stageSnapshot === "Ready for pathologist handoff") return { latest: latestOut, missing: null };

  const blocks = data.blocks.filter((b) => b.caseId === caseId);
  const cut = new Set(evs.filter((e) => e.type === "CUTUP_COMPLETE" && e.blockId).map((e) => e.blockId));
  if (c.blocksComplete > 0 && c.blocksComplete < c.blocksExpected) {
    const open = blocks.filter((b) => !cut.has(b.blockId)).map((b) => b.blockId);
    return { latest: latestOut, missing: `Cut-up of ${open.join(", ")} not yet recorded; whole-case handoff waits for every block` };
  }
  const short = blocks.find((b) => b.levelsRecorded > 0 && b.levelsRecorded < b.levelsRequired);
  if (short) {
    const from = short.levelsRecorded + 1;
    const levels = from === short.levelsRequired ? `Level ${from}` : `Levels ${from}–${short.levelsRequired}`;
    return { latest: latestOut, missing: `${levels} not recorded for block ${short.blockId} (protocol requires ${short.levelsRequired}); staff review needed` };
  }
  const expected = evs.find((e) => e.type === "SCAN_EXPECTED");
  if (expected && !evs.some((e) => e.type === "SCAN_COMPLETE")) {
    return { latest: latestOut, missing: `Scan-complete event not recorded (scan expected since ${expected.at}); check the slide location or scan record` };
  }
  return { latest: latestOut, missing: NEXT_BY_STAGE[c.stageSnapshot] ?? "Not enough information" };
}
