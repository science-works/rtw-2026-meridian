import { motion } from "motion/react";
import { useEffect, useState } from "react";
import type { Alert, CaseSummary, Overview, Stage } from "../../../shared/types";
import { useFx } from "../fx";
import { Count } from "./Flow";

interface Props {
  overview: Overview;
  cases: CaseSummary[];
  alerts: Alert[];
  selected: Stage | null;
  onSelect: (stage: Stage | null) => void;
  pulse: Set<string>;
  /** Changing this replays the "lab wakes up" animation (Story mode step 1). */
  wakeKey?: number;
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

const WAKE_MS = 800; // whole lab-river entrance, ≤ 900 ms

/**
 * The workflow pipeline ("lab river"): one lane per stage, one dot per real case.
 * Counts come straight from /api/overview; dots from /api/cases.
 */
export function Pipeline({ overview, cases, alerts, selected, onSelect, pulse, wakeKey = 0 }: Props) {
  const fx = useFx();
  const [awake, setAwake] = useState(!fx.on);

  // On load (and when Story mode replays it) counts start at 0 and roll up to the real totals.
  useEffect(() => {
    if (!fx.on) {
      setAwake(true);
      return;
    }
    setAwake(false);
    const id = requestAnimationFrame(() => setAwake(true));
    return () => cancelAnimationFrame(id);
  }, [wakeKey, fx.on]);

  const flagged = new Set(alerts.flatMap((a) => a.caseIds));
  return (
    <nav className="pipeline" aria-label="Workflow stages">
      {overview.stages.map((s, lane) => {
        const inStage = cases.filter((c) => c.stage === s.stage);
        const nFlagged = inStage.filter((c) => flagged.has(c.caseId)).length;
        const nUrgent = inStage.filter((c) => c.priority === "Urgent").length;
        const isPulsing = inStage.some((c) => pulse.has(c.caseId));
        const perDot = inStage.length ? Math.min(0.006, (WAKE_MS / 1000 - 0.25) / inStage.length) : 0;
        return (
          <button
            key={s.stage}
            data-stage={s.stage}
            className={`lane ${selected === s.stage ? "selected" : ""} ${isPulsing ? "pulse" : ""} ${s.stage === "Ready for pathologist handoff" ? "done" : ""}`}
            onClick={() => onSelect(selected === s.stage ? null : s.stage)}
            aria-pressed={selected === s.stage}
            title={s.stage}
          >
            <span className="lane-name">{SHORT_STAGE[s.stage]}</span>
            <Count className="lane-total mono" value={awake ? s.total : 0} />
            <span className="lane-split">
              <span className="split-backlog">{s.backlog > 0 ? `${s.backlog} backlog` : " "}</span>
              <span>{s.today} today</span>
            </span>
            <motion.span
              key={wakeKey}
              className="lane-dots"
              aria-hidden
              initial={fx.on ? "hidden" : false}
              animate="shown"
              variants={{ hidden: {}, shown: { transition: { delayChildren: lane * 0.025, staggerChildren: perDot } } }}
            >
              {inStage.map((c) => (
                <motion.i
                  key={c.caseId}
                  className={`dot ${flagged.has(c.caseId) ? "d-alert" : c.priority === "Urgent" ? "d-urgent" : c.cohort === "Previous-day backlog" ? "d-backlog" : ""}`}
                  variants={{ hidden: { opacity: 0, x: -14 }, shown: { opacity: 1, x: 0, transition: { duration: 0.25 } } }}
                />
              ))}
            </motion.span>
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
