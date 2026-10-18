// The light simulation (Victoria's "Histo main lab" drawing) as a pure function of the
// recorded data and a time. Positions come only from recorded events and each case's
// recorded "stage entered" time; at 11:30 they equal the server's station map.
import { CLOCK_MINUTES, formatSimTime, parseSimTime } from "./clock";
import { generic } from "./labels";
import type { CellpathData, EventRecord } from "./types";

export type NodeId = string;

export interface SimNode {
  id: NodeId;
  label: string;
  /** Position on the board in layout units (the page scales them to its size). */
  x: number;
  y: number;
  kind: "start" | "station" | "queue" | "end";
}

const col = (i: number) => 40 + i * 92;
export const NODES: SimNode[] = [
  { id: "received", label: "Samples received", x: col(0), y: 280, kind: "start" },
  { id: "cutup", label: "Cut-up", x: col(1), y: 280, kind: "station" },
  { id: "decal", label: "Decalcification", x: col(1), y: 500, kind: "queue" },
  { id: "processor-a", label: "Processor A", x: col(2), y: 110, kind: "station" },
  { id: "processor-b", label: "Processor B", x: col(2), y: 210, kind: "station" },
  { id: "processor-c", label: "Processor C", x: col(2), y: 310, kind: "station" },
  { id: "processor-d", label: "Processor D", x: col(2), y: 410, kind: "station" },
  { id: "embedder-1", label: "Embedder 1", x: col(3), y: 220, kind: "station" },
  { id: "embedder-2", label: "Embedder 2", x: col(3), y: 340, kind: "station" },
  { id: "microtomy-queue", label: "Microtomy queue", x: col(4), y: 280, kind: "queue" },
  { id: "microtome-1", label: "Microtome 1", x: col(5), y: 80, kind: "station" },
  { id: "microtome-2", label: "Microtome 2", x: col(5), y: 160, kind: "station" },
  { id: "microtome-3", label: "Microtome 3", x: col(5), y: 240, kind: "station" },
  { id: "microtome-4", label: "Microtome 4", x: col(5), y: 320, kind: "station" },
  { id: "microtome-5", label: "Microtome 5", x: col(5), y: 400, kind: "station" },
  { id: "microtome-6", label: "Microtome 6", x: col(5), y: 480, kind: "station" },
  { id: "stainer", label: "Stainer", x: col(6), y: 280, kind: "station" },
  { id: "scanner-queue", label: "Scanner queue", x: col(7), y: 280, kind: "queue" },
  { id: "scanner-1", label: "Scanner 1", x: col(8), y: 220, kind: "station" },
  { id: "scanner-2", label: "Scanner 2", x: col(8), y: 340, kind: "station" },
  { id: "iqc", label: "IQC", x: col(9), y: 280, kind: "station" },
  { id: "emitted", label: "Cases emitted", x: col(10) - 20, y: 280, kind: "end" },
];

/** Trajectory lines (from → to) drawn on the board; samples move only along these. */
export const EDGES: [NodeId, NodeId][] = [
  ["received", "cutup"],
  ["cutup", "decal"],
  ...["a", "b", "c", "d"].map((p) => ["cutup", `processor-${p}`] as [NodeId, NodeId]),
  ...["a", "b", "c", "d"].map((p) => ["decal", `processor-${p}`] as [NodeId, NodeId]),
  ...["a", "b", "c", "d"].flatMap((p) => [1, 2].map((e) => [`processor-${p}`, `embedder-${e}`] as [NodeId, NodeId])),
  ["embedder-1", "microtomy-queue"],
  ["embedder-2", "microtomy-queue"],
  ...[1, 2, 3, 4, 5, 6].map((m) => ["microtomy-queue", `microtome-${m}`] as [NodeId, NodeId]),
  ...[1, 2, 3, 4, 5, 6].map((m) => [`microtome-${m}`, "stainer"] as [NodeId, NodeId]),
  ["stainer", "scanner-queue"],
  ["scanner-queue", "scanner-1"],
  ["scanner-queue", "scanner-2"],
  ["scanner-1", "iqc"],
  ["scanner-2", "iqc"],
  ["iqc", "emitted"],
];

/** Which /api/stations card each node corresponds to (for the 11:30 equality check and the station pages). */
export const NODE_TO_CARD: Record<NodeId, string> = {
  received: "reception",
  cutup: "reception",
  decal: "decal",
  ...Object.fromEntries(["a", "b", "c", "d"].map((p) => [`processor-${p}`, `processor-${p}`])),
  "embedder-1": "embedding-1",
  "embedder-2": "embedding-2",
  "microtomy-queue": "microtomy-queue",
  ...Object.fromEntries([1, 2, 3, 4, 5, 6].map((m) => [`microtome-${m}`, `microtomy-${m}`])),
  stainer: "stainer-1",
  "scanner-queue": "scanner-queue",
  "scanner-1": "scanner-1",
  "scanner-2": "scanner-2",
  iqc: "iqc-1",
  emitted: "handoff",
};

export const PLAY_FROM = parseSimTime("Day -1 06:30");
export const PLAY_TO = CLOCK_MINUTES;

/** Node for a recorded station string (generic label), or null when it is not a place. */
export function nodeForStation(station: string | null, processor: string | null): NodeId | null {
  const s = generic(station) ?? "";
  let m: RegExpExecArray | null;
  if (/booking/i.test(s)) return "received";
  if (/cut-up/i.test(s)) return "cutup";
  if (/decalcification/i.test(s)) return "decal";
  if ((m = /^Processor ([A-D])$/.exec(s))) return `processor-${m[1].toLowerCase()}`;
  if (s === "Processor queue") return processor && /^Processor [A-D]$/.test(processor) ? `processor-${processor.slice(-1).toLowerCase()}` : null;
  if ((m = /^Embedding station (\d)$/.exec(s))) return `embedder-${m[1]}`;
  if (s === "Microtomy queue") return "microtomy-queue";
  if ((m = /^Microtomy station (\d)$/.exec(s))) return `microtome-${m[1]}`;
  if (s === "H&E auto-stainer 1" || s === "Slide drying oven") return "stainer";
  if (s === "Scanner queue") return "scanner-queue";
  if ((m = /^Digital scanner (\d)$/.exec(s))) return `scanner-${m[1]}`;
  if (s === "IQC workstation 1") return "iqc";
  if (/Case completion/i.test(s)) return "emitted";
  return null;
}

const byTime = (a: EventRecord, b: EventRecord) => parseSimTime(a.at) - parseSimTime(b.at) || a.eventId.localeCompare(b.eventId);

export interface Timeline {
  cases: Map<string, { waypoints: { t: number; node: NodeId }[]; urgent: boolean }>;
  incidents: { t: number; node: NodeId }[];
  /** Blocks recorded at a different station from the rest of their case (e.g. 26H1003 A1–E1 in Processor D). */
  splits: { caseId: string; t: number; node: NodeId; label: string }[];
}

const range = (ids: string[]) => {
  const s = [...ids].sort();
  return s.length > 1 ? `${s[0]}–${s.at(-1)}` : s[0];
};

/** Precomputes each case's recorded waypoints. Pure; same input gives the same timeline. */
export function buildTimeline(data: CellpathData): Timeline {
  const eventsByCase = new Map<string, EventRecord[]>();
  for (const e of data.events) eventsByCase.set(e.caseId, [...(eventsByCase.get(e.caseId) ?? []), e]);
  const blocksByCase = new Map<string, CellpathData["blocks"]>();
  for (const b of data.blocks) blocksByCase.set(b.caseId, [...(blocksByCase.get(b.caseId) ?? []), b]);

  const cases: Timeline["cases"] = new Map();
  const splits: Timeline["splits"] = [];
  for (const c of data.cases) {
    const all = [...(eventsByCase.get(c.caseId) ?? [])].sort(byTime);
    const evs = all.filter((e) => e.type !== "CURRENT_STAGE_SNAPSHOT");
    const blocks = blocksByCase.get(c.caseId) ?? [];
    /** Equipment unit: block location first, then the latest event at such a unit (same rule as the station map). */
    const unit = (re: RegExp): string | null => {
      for (const b of blocks) {
        const m = re.exec(generic(b.location) ?? "");
        if (m) return m[1];
      }
      const e = [...all].reverse().find((x) => re.test(generic(x.station) ?? ""));
      const m = e ? re.exec(generic(e.station) ?? "") : null;
      return m ? m[1] : null;
    };
    const snapshotNode = ((): NodeId | null => {
      switch (c.stageSnapshot) {
        case "Received/booked":
          return "received";
        case "Waiting for dissection/cut-up":
          return "cutup";
        case "Decalcification":
          return "decal";
        case "Awaiting processor or processing":
          return c.processor && /^Processor [A-D]$/.test(c.processor) ? `processor-${c.processor.slice(-1).toLowerCase()}` : null;
        case "Embedding": {
          const u = unit(/^Embedding station (\d)$/);
          return u ? `embedder-${u}` : null;
        }
        case "Microtomy": {
          const u = unit(/^Microtomy station (\d)$/);
          return u ? `microtome-${u}` : "microtomy-queue";
        }
        case "H&E staining":
          return "stainer";
        case "Scanning": {
          const u = unit(/^Digital scanner (\d)$/);
          return u ? `scanner-${u}` : "scanner-queue";
        }
        case "IQC":
          return "iqc";
        case "Ready for pathologist handoff":
          return "emitted";
      }
    })();
    const entered = parseSimTime(c.stageEnteredAt);
    const waypoints: { t: number; node: NodeId }[] = [];
    for (const e of evs) {
      const t = parseSimTime(e.at);
      if (t >= entered) break; // from the recorded stage-entered time, the case is at its recorded stage
      const node = nodeForStation(e.station, c.processor);
      if (node && waypoints.at(-1)?.node !== node) waypoints.push({ t, node });
    }
    if (snapshotNode) waypoints.push({ t: entered, node: snapshotNode });
    cases.set(c.caseId, { waypoints, urgent: c.priority === "Urgent" });

    // Split cases: blocks whose recorded location is another station, from the latest event there.
    const groups = new Map<NodeId, string[]>();
    for (const b of blocks) {
      const node = nodeForStation(b.location, c.processor);
      if (node && node !== snapshotNode) groups.set(node, [...(groups.get(node) ?? []), b.blockId]);
    }
    if (groups.size && blocks.length > 1)
      for (const [node, ids] of groups) {
        const at = [...evs].reverse().find((e) => nodeForStation(e.station, c.processor) === node);
        splits.push({ caseId: c.caseId, t: at ? parseSimTime(at.at) : entered, node, label: `${c.caseId} · ${range(ids)}` });
      }
  }

  // Incidents, from recorded events: a stain-run failure, and a levels cut short of the protocol.
  const incidents: Timeline["incidents"] = [];
  for (const e of data.events) if (e.type === "STAIN_RUN_FAILED") incidents.push({ t: parseSimTime(e.at), node: "stainer" });
  for (const b of data.blocks.filter((x) => x.levelsRecorded > 0 && x.levelsRecorded < x.levelsRequired)) {
    const cut = (eventsByCase.get(b.caseId) ?? []).filter((e) => e.type === "LEVELS_CUT" && e.blockId === b.blockId).sort(byTime).at(-1);
    const node = cut ? nodeForStation(cut.station, null) : null;
    if (cut && node) incidents.push({ t: parseSimTime(cut.at), node });
  }
  return { cases, incidents, splits };
}

export interface SimState {
  t: number;
  /** caseId → node, for every case received by time t. */
  positions: Map<string, NodeId>;
  counts: Map<NodeId, number>;
  /** Nodes with an incident recorded by time t. */
  incidents: NodeId[];
  /** Split-case block groups present at a node by time t, e.g. "26H1003 · A1–E1". */
  blocksAt: Map<NodeId, string[]>;
}

/** Rebuilds a Timeline from the /api/simulation payload. */
export function timelineFrom(r: {
  cases: { caseId: string; urgent: boolean; waypoints: [number, string][] }[];
  incidents: { t: number; node: NodeId }[];
  splits?: Timeline["splits"];
}): Timeline {
  return { cases: new Map(r.cases.map((c) => [c.caseId, { urgent: c.urgent, waypoints: c.waypoints.map(([t, node]) => ({ t, node })) }])), incidents: r.incidents, splits: r.splits ?? [] };
}

/** Where every case is at time t (minutes since Day 0 00:00). Pure. */
export function stateAt(timeline: Timeline, t: number): SimState {
  const positions = new Map<string, NodeId>();
  const counts = new Map<NodeId, number>();
  for (const [caseId, { waypoints }] of timeline.cases) {
    let node: NodeId | null = null;
    for (const w of waypoints) {
      if (w.t > t) break;
      node = w.node;
    }
    if (node) {
      positions.set(caseId, node);
      counts.set(node, (counts.get(node) ?? 0) + 1);
    }
  }
  const blocksAt = new Map<NodeId, string[]>();
  for (const s of timeline.splits ?? []) {
    if (s.t > t || !positions.has(s.caseId) || positions.get(s.caseId) === s.node) continue;
    counts.set(s.node, (counts.get(s.node) ?? 0) + 1);
    blocksAt.set(s.node, [...(blocksAt.get(s.node) ?? []), s.label]);
  }
  const incidents = [...new Set(timeline.incidents.filter((i) => i.t <= t).map((i) => i.node))];
  return { t, positions, counts, incidents, blocksAt };
}

export interface SeriesPoint {
  t: number;
  /** Cases of the set received by t. */
  received: number;
  /** Cases of the set at "Cases emitted" (ready for pathologist handoff) by t. */
  cleared: number;
}

/** Received and cleared counts over time for a set of cases, from the same stateAt(t). Pure. */
export function seriesFor(timeline: Timeline, caseIds: Iterable<string>, from: number, to: number, stepMin = 60): SeriesPoint[] {
  const ids = new Set(caseIds);
  const sub: Timeline = { cases: new Map([...timeline.cases].filter(([id]) => ids.has(id))), incidents: [], splits: [] };
  const out: SeriesPoint[] = [];
  for (let t = from; ; t = Math.min(to, t + stepMin)) {
    const s = stateAt(sub, t);
    out.push({ t, received: s.positions.size, cleared: s.counts.get("emitted") ?? 0 });
    if (t >= to) break;
  }
  return out;
}

/**
 * Playback rate relative to staffed daytime: overnight (17:00–06:30) ×6 faster; the last hour
 * before the clock (10:30–11:30, where the incidents are recorded) plays 10× slower, so it gets
 * about a quarter of the playback.
 */
export function rateAt(m: number, end: number = PLAY_TO): number {
  if (m >= end - 60) return 0.1;
  const d = ((m % 1440) + 1440) % 1440;
  return d >= 390 && d < 1020 ? 1 : 6;
}

/** Plain-English caption for the playback clock. Incident times come from the recorded events. */
export function captionAt(t: number, incidents: { t: number; node: NodeId }[], end: number = PLAY_TO): string {
  const hhmm = (m: number) => formatSimTime(m).slice(-5);
  const mismatch = incidents.find((i) => i.node.startsWith("microtome-"));
  const stainer = incidents.find((i) => i.node === "stainer");
  if (t >= end) return `${hhmm(end)} — now: same counts as the dashboard`;
  if (stainer && t >= stainer.t) return `${hhmm(stainer.t)} — Stainer basket failed`;
  if (mismatch && t >= mismatch.t) return `${hhmm(mismatch.t)} — Microtome ${mismatch.node.slice(-1)}: levels mismatch`;
  if (t >= parseSimTime("Day 1 08:30")) return "Microtomy queue builds: yesterday's backlog";
  if (t >= parseSimTime("Day 1 06:30")) return "Tuesday 07:00 — embedding starts";
  if (t >= parseSimTime("Day 0 17:00")) return "Overnight — processing (×6 speed)";
  if (t >= parseSimTime("Day 0 16:00")) return "Evening — loaded into processors";
  if (t >= parseSimTime("Day 0 06:30")) return "Monday — cases arrive and are cut up";
  if (t >= parseSimTime("Day -1 17:00")) return "Overnight — processing (×6 speed)";
  return "Previous working day — the first backlog cases arrive";
}
