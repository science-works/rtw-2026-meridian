// Insight visuals: dwell times per stage from the recorded event log, and their percentiles.
// Pure functions; every number comes from recorded events and each case's recorded stage.
import { CLOCK_MINUTES, parseSimTime } from "./clock";
import type { CellpathData } from "./types";

/** Stages a case can dwell in, in workflow order (handoff is the end, so it has no dwell). */
export const DWELL_STAGES = ["Received", "Cut-up", "Decalcification", "Processing", "Embedding", "Microtomy", "H&E staining", "Scanning", "IQC"] as const;
export type DwellStage = (typeof DWELL_STAGES)[number] | "Ready";

const STAGE_MAP: Record<string, DwellStage> = {
  "Received/booked": "Received",
  "Waiting for dissection/cut-up": "Cut-up",
  "Dissection/cut-up": "Cut-up",
  Decalcification: "Decalcification",
  "Awaiting processor or processing": "Processing",
  Embedding: "Embedding",
  Microtomy: "Microtomy",
  "H&E staining": "H&E staining",
  Scanning: "Scanning",
  IQC: "IQC",
  "Ready for pathologist handoff": "Ready",
};

export interface Dwell {
  stage: DwellStage;
  /** Minutes from entering the stage to entering the next one (or to the clock while in progress). */
  minutes: number;
  inProgress: boolean;
}

/** Linear-interpolation percentile (the common "type 7" definition). p in 0..100. */
export function percentile(values: number[], p: number): number {
  if (!values.length) return Number.NaN;
  const s = [...values].sort((a, b) => a - b);
  const x = (p / 100) * (s.length - 1);
  const lo = Math.floor(x);
  const hi = Math.ceil(x);
  return s[lo] + (s[hi] - s[lo]) * (x - lo);
}

/** Each case's stage dwells, from its recorded events (snapshots excluded) and its recorded current stage. */
export function dwellsByCase(data: CellpathData, clock = CLOCK_MINUTES): Map<string, Dwell[]> {
  const byCase = new Map<string, { t: number; stage: DwellStage }[]>();
  for (const e of data.events) {
    if (e.type === "CURRENT_STAGE_SNAPSHOT") continue;
    const stage = STAGE_MAP[e.stage];
    if (!stage) continue;
    byCase.set(e.caseId, [...(byCase.get(e.caseId) ?? []), { t: parseSimTime(e.at), stage }]);
  }
  const out = new Map<string, Dwell[]>();
  for (const c of data.cases) {
    const evs = (byCase.get(c.caseId) ?? []).sort((a, b) => a.t - b.t);
    const entries: { t: number; stage: DwellStage }[] = [];
    for (const e of evs) if (entries.at(-1)?.stage !== e.stage) entries.push(e);
    const current = STAGE_MAP[c.stageSnapshot];
    const enteredAt = parseSimTime(c.stageEnteredAt);
    if (current && entries.at(-1)?.stage !== current) entries.push({ t: enteredAt, stage: current });
    const dwells: Dwell[] = [];
    for (let i = 0; i < entries.length; i++) {
      const { stage, t } = entries[i];
      if (stage === "Ready") continue;
      const next = entries[i + 1];
      const minutes = (next ? next.t : clock) - t;
      if (minutes >= 0) dwells.push({ stage, minutes, inProgress: !next });
    }
    out.set(c.caseId, dwells);
  }
  return out;
}

export interface DwellStats {
  stage: DwellStage;
  n: number;
  p10: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
}

/** Typical dwell per stage across all cases: completed dwells only (an unfinished stay is not a dwell time). */
export function dwellStats(dwells: Map<string, Dwell[]>): DwellStats[] {
  return DWELL_STAGES.map((stage) => {
    const v = [...dwells.values()].flat().filter((d) => d.stage === stage && !d.inProgress).map((d) => d.minutes);
    return { stage, n: v.length, p10: percentile(v, 10), p25: percentile(v, 25), p50: percentile(v, 50), p75: percentile(v, 75), p90: percentile(v, 90) };
  }).filter((s) => s.n > 0);
}

/** "3h10", "45m". */
export const fmtMinutes = (m: number) => {
  const r = Math.round(m);
  return r >= 60 ? `${Math.floor(r / 60)}h${String(r % 60).padStart(2, "0")}` : `${r}m`;
};
