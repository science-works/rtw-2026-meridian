import type { Alert, CaseSummary, Overview, Stage } from "../../../shared/types";

interface Props {
  overview: Overview;
  cases: CaseSummary[];
  alerts: Alert[];
  selected: Stage | null;
  onSelect: (stage: Stage | null) => void;
  pulse: Set<string>;
}

/** Short lane labels for the projector; the full recorded stage name is the tooltip and the filter title. */
export const SHORT_STAGE: Record<Stage, string> = {
  "Received/booked": "Received",
  "Waiting for dissection/cut-up": "Awaiting cut-up",
  "Awaiting processor or processing": "Processor",
  Decalcification: "Decalcification",
  Embedding: "Embedding",
  Microtomy: "Microtomy",
  "H&E staining": "H&E staining",
  Scanning: "Scanning",
  IQC: "IQC",
  "Ready for pathologist handoff": "Ready for pathologist",
};

/** The workflow pipeline: one lane per stage, counts straight from /api/overview. */
export function Pipeline({ overview, cases, alerts, selected, onSelect, pulse }: Props) {
  const flagged = new Set(alerts.flatMap((a) => a.caseIds));
  const max = Math.max(...overview.stages.map((s) => s.total), 1);
  return (
    <nav className="pipeline" aria-label="Workflow stages">
      {overview.stages.map((s) => {
        const inStage = cases.filter((c) => c.stage === s.stage);
        const nFlagged = inStage.filter((c) => flagged.has(c.caseId)).length;
        const nUrgent = inStage.filter((c) => c.priority === "Urgent").length;
        const isPulsing = inStage.some((c) => pulse.has(c.caseId));
        return (
          <button
            key={s.stage}
            className={`lane ${selected === s.stage ? "selected" : ""} ${isPulsing ? "pulse" : ""} ${s.stage === "Ready for pathologist handoff" ? "done" : ""}`}
            onClick={() => onSelect(selected === s.stage ? null : s.stage)}
            aria-pressed={selected === s.stage}
            title={s.stage}
          >
            <span className="lane-name">{SHORT_STAGE[s.stage]}</span>
            <span className="lane-total mono">{s.total}</span>
            <span className="lane-split">
              <span className="split-backlog">{s.backlog > 0 ? `${s.backlog} backlog` : "\u00a0"}</span>
              <span>{s.today} today</span>
            </span>
            <span className="lane-bar" aria-hidden>
              <span style={{ width: `${(s.total / max) * 100}%` }} />
            </span>
            <span className="lane-flags">
              {nFlagged > 0 && <span className="flag-alert">{nFlagged} flagged</span>}
              {nUrgent > 0 && <span className="flag-urgent">{nUrgent} urgent</span>}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
