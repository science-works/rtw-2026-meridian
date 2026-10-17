// The four deterministic alert rules (CLAUDE.md). Rules read recorded events only;
// the staged basket failure counts only after the simulator has appended it.
import { parseSimTime } from "../../../shared/clock";
import { generic } from "../../../shared/labels";
import type { Alert, BlockRecord, CellpathData, EventRecord } from "../../../shared/types";

const byTime = (a: EventRecord, b: EventRecord) => parseSimTime(a.at) - parseSimTime(b.at) || a.eventId.localeCompare(b.eventId);
const latest = (evs: EventRecord[]) => [...evs].sort(byTime).at(-1);

/** "A1, B1, C1" → "A1–C1" when the letters are consecutive with the same suffix. */
export function blockRange(ids: string[]): string {
  const sorted = [...ids].sort();
  const consecutive =
    sorted.length > 2 &&
    sorted.every((id, i) => i === 0 || (id.slice(1) === sorted[0].slice(1) && id.charCodeAt(0) === sorted[i - 1].charCodeAt(0) + 1));
  return consecutive ? `${sorted[0]}–${sorted.at(-1)}` : sorted.join(", ");
}

/** Minutes from a timing rule's value, e.g. "60 minutes per repeat" → 60. */
function ruleMinutes(data: CellpathData, rule: string): number | null {
  const v = data.timingRules.find((r) => r.rule === rule)?.value;
  const m = v ? /(\d+)\s*min/.exec(v) : null;
  return m ? Number(m[1]) : null;
}

// Rule 1: some, but not all, required blocks complete. A case with no blocks
// complete is simply waiting at cut-up as a whole, which is normal workflow.
function outstandingBlocks(data: CellpathData, events: EventRecord[]): Alert[] {
  return data.cases
    .filter((c) => c.blocksComplete > 0 && c.blocksComplete < c.blocksExpected)
    .map((c) => {
      const blocks = data.blocks.filter((b) => b.caseId === c.caseId);
      const evs = events.filter((e) => e.caseId === c.caseId);
      const cutUp = new Set(evs.filter((e) => e.type === "CUTUP_COMPLETE" && e.blockId).map((e) => e.blockId!));
      const done = blocks.filter((b) => cutUp.has(b.blockId));
      const open = blocks.filter((b) => !cutUp.has(b.blockId));
      const openIds = blockRange(open.map((b) => b.blockId));
      const doneIds = blockRange(done.map((b) => b.blockId));
      const evidenceFor = (b: BlockRecord) => {
        const e = latest(evs.filter((x) => x.blockId === b.blockId));
        return { eventId: e?.eventId, text: generic(`${b.blockId}: ${b.location}; ${b.status}${e ? ` (${e.at})` : ""}`) };
      };
      const doneWhere = [...new Set(done.map((b) => `${b.location}; ${b.status.charAt(0).toLowerCase()}${b.status.slice(1)}`))].join(" / ");
      const raised = latest(evs.filter((e) => open.some((b) => b.blockId === e.blockId)));
      return {
        id: `outstanding_block:${c.caseId}`,
        kind: "outstanding_block",
        severity: "medium",
        raisedAt: raised?.at ?? data.meta.clock,
        caseIds: [c.caseId],
        what: `${c.caseId}: ${c.blocksComplete} of ${c.blocksExpected} blocks complete; ${openIds} outstanding`,
        evidence: [...open.map(evidenceFor), ...done.map(evidenceFor)],
        why: generic(
          `Whole-case handoff waits for every required block. ${doneIds}: ${doneWhere}. ${openIds} is not complete, so there is no reliable whole-case handoff estimate while ${openIds} is outstanding.`,
        ),
        suggestedCheck: `Confirm with the cut-up bench when ${openIds} will be cut up; the rest of the case cannot be handed off without it.`,
      } satisfies Alert;
    });
}

// Rule 2: a block has some levels recorded, but fewer than its protocol requires.
function protocolMismatches(data: CellpathData, events: EventRecord[]): Alert[] {
  return data.blocks
    .filter((b) => b.levelsRecorded > 0 && b.levelsRecorded < b.levelsRequired)
    .map((b) => {
      const slides = data.slides.filter((s) => s.caseId === b.caseId && s.blockId === b.blockId);
      const evs = events.filter((e) => e.caseId === b.caseId && e.blockId === b.blockId);
      const cut = evs.filter((e) => e.type === "LEVELS_CUT").sort(byTime);
      const flagged = evs.filter((e) => e.type === "LEVEL_PROTOCOL_MISMATCH");
      const levels = slides.map((s) => s.level).filter(Boolean).join(", ") || "none listed";
      const station = cut.at(-1)?.station;
      return {
        id: `protocol_mismatch:${b.caseId}/${b.blockId}`,
        kind: "protocol_mismatch",
        severity: "high",
        raisedAt: cut.at(-1)?.at ?? data.meta.clock,
        caseIds: [b.caseId],
        slideIds: slides.map((s) => s.slideId),
        what: `${b.caseId} block ${b.blockId}: ${b.levelsRecorded} of ${b.levelsRequired} required levels recorded`,
        evidence: [
          ...[...cut, ...flagged].map((e) => ({ eventId: e.eventId, text: generic(`${e.at} at ${e.station ?? "unknown station"}: ${e.details}`) })),
          { text: `Slides recorded for ${b.blockId}: ${levels}` },
        ],
        why: `The protocol for block ${b.blockId} requires ${b.levelsRequired} levels, but only ${b.levelsRecorded} is recorded. Meridian does not advance the case or assume a recut.`,
        suggestedCheck: generic(`Staff review: check the protocol and the cutting record${station ? ` at ${station}` : ""} before the case advances.`),
      } satisfies Alert;
    });
}

// Rule 3: the staged stain-run failure, once the simulator has appended it.
function basketFailures(data: CellpathData, events: EventRecord[]): Alert[] {
  const repeat = ruleMinutes(data, "Prisma repeat stain");
  return events
    .filter((e) => e.type === "STAIN_RUN_FAILED")
    .map((f) => {
      const slides = data.slides.filter((s) => s.basket && f.station?.includes(s.basket));
      const caseIds = [...new Set(slides.map((s) => s.caseId))].sort();
      const loaded = events.filter((e) => e.type === "BASKET_LOADED" && slides.some((s) => s.slideId === e.slideId));
      const basket = generic(slides[0]?.basket ?? f.station ?? "Stainer basket");
      return {
        id: `basket_failure:${f.eventId}`,
        kind: "basket_failure",
        severity: "high",
        raisedAt: f.at,
        caseIds,
        slideIds: slides.map((s) => s.slideId),
        what: `${basket} stain run failed: ${slides.length} slides across ${caseIds.length} cases`,
        evidence: [
          { eventId: f.eventId, text: `${f.at}: stain run failed for ${basket} (simulated event)` },
          { text: `${loaded.length} slides were loaded into ${basket}${loaded[0] ? ` at ${loaded[0].at}` : ""}: ${caseIds.join(", ")}` },
        ],
        why:
          repeat === null
            ? `Every slide in a failed basket needs staining again. The repeat-run duration is not configured, so the extra time is unknown.`
            : `Every slide in a failed basket needs staining again. Each affected case's handoff estimate moves back by the ${repeat}-minute repeat run (illustrative timing rule); queue time is not modelled.`,
        suggestedCheck: `Check the stainer run log and the ${slides.length} slides from ${basket}, then decide on the repeat stain.`,
      } satisfies Alert;
    });
}

// Rule 4: scan expected, no scan-complete for the case, while later cases were scanned.
function scanGaps(data: CellpathData, events: EventRecord[]): Alert[] {
  const completes = events.filter((e) => e.type === "SCAN_COMPLETE");
  return events
    .filter((e) => e.type === "SCAN_EXPECTED" && !completes.some((s) => s.caseId === e.caseId))
    .flatMap((exp) => {
      const t = parseSimTime(exp.at);
      const later = completes.filter((s) => parseSimTime(s.at) > t).sort(byTime);
      const comparators = [...new Set(later.map((s) => s.caseId))];
      if (comparators.length === 0) return []; // nothing to compare against: not enough information to flag
      const slides = data.slides.filter((s) => s.caseId === exp.caseId);
      const stained = events.find((e) => e.caseId === exp.caseId && e.type === "STAINING_COMPLETE");
      return [
        {
          id: `scan_gap:${exp.caseId}`,
          kind: "scan_gap",
          severity: "medium",
          raisedAt: data.meta.clock,
          caseIds: [exp.caseId],
          slideIds: slides.map((s) => s.slideId),
          what: `${exp.caseId}: missing scan event (scan expected since ${exp.at})`,
          evidence: [
            ...(stained ? [{ eventId: stained.eventId, text: `${stained.at}: staining complete; slides scan-ready` }] : []),
            { eventId: exp.eventId, text: `${exp.at}: scan expected` },
            { text: `No scan-complete event recorded for ${slides.map((s) => s.slideId).join(", ") || exp.caseId} by ${data.meta.clock}` },
            { text: `${comparators.length} later cases have scan-complete events (${later[0].at} to ${later.at(-1)!.at}): ${comparators.join(", ")}` },
          ],
          why: "Later cases already have scan records, so the missing scan event for this case is out of pattern. The cause is not recorded.",
          suggestedCheck: "Missing scan event; check the slide location or scan record.",
        } satisfies Alert,
      ];
    });
}

export function computeAlerts(data: CellpathData): Alert[] {
  const events = data.events.filter((e) => e.activation === "Recorded");
  return [
    ...basketFailures(data, events),
    ...protocolMismatches(data, events),
    ...outstandingBlocks(data, events),
    ...scanGaps(data, events),
  ];
}
