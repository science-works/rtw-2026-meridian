// One consistent line per case everywhere (master prompt): "26H1001 · Microtomy station 3 · cutting · ETA 14:15",
// or "ETA unknown — reason" when the rules cannot compute one.
import type { CaseSummary, Stage } from "../../shared/types";

const ACTIVITY: Record<Stage, string> = {
  "Received/booked": "booked in",
  "Waiting for dissection/cut-up": "awaiting cut-up",
  "Awaiting processor or processing": "processing",
  Decalcification: "decalcifying",
  Embedding: "embedding",
  Microtomy: "cutting",
  "H&E staining": "staining",
  Scanning: "scanning",
  IQC: "in review",
  "Ready for pathologist handoff": "ready",
};

const EQUIPMENT = /^(Processor [A-D]|Embedding station \d|Microtomy station \d|H&E auto-stainer \d|Digital scanner \d|IQC workstation \d)$/;

/** "Microtomy station 4 · cutting"; a location that already names the stage stands alone. */
export function whereOf(c: CaseSummary): string {
  return EQUIPMENT.test(c.location) ? `${c.location} · ${activityOf(c)}` : c.location;
}

export function activityOf(c: CaseSummary): string {
  if (/queue/i.test(c.location)) return c.stage === "Microtomy" ? "waiting to be cut" : c.stage === "Scanning" ? "waiting to scan" : "queued";
  return ACTIVITY[c.stage];
}

/** "14:15" on the demo day, otherwise "Day 2 06:45". */
export const shortTime = (at: string) => (at.startsWith("Day 1 ") ? at.slice(-5) : at);

export function etaText(c: CaseSummary): { text: string; tone: "ready" | "eta" | "unknown"; reason?: string } {
  const e = c.estimate;
  if (e.status === "ready") return { text: `Ready ${shortTime(e.readyAt!)}`, tone: "ready" };
  if (e.status === "estimated") return { text: `ETA ${shortTime(e.readyAt!)}`, tone: "eta" };
  return { text: "ETA unknown", tone: "unknown", reason: e.reasonUnknown?.replace(/\.$/, "") };
}

export function CaseLine({ c, showId = true }: { c: CaseSummary; showId?: boolean }) {
  const eta = etaText(c);
  return (
    <span className="case-line">
      {showId && <span className={`mono case-id ${c.priority === "Urgent" ? "is-urgent" : ""}`}>{c.caseId}</span>}
      <span className="case-where">{whereOf(c)}</span>
      <span className={`case-eta ${eta.tone}`} title={eta.reason}>
        {eta.text}
        {eta.reason && <span className="eta-reason"> — {eta.reason}</span>}
      </span>
    </span>
  );
}
