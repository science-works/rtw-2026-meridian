import { motion } from "motion/react";
import { useEffect, useState } from "react";
import type { CaseDetail } from "../../../shared/types";
import { api } from "../api";

const COLUMNS: { label: string; stages: string[] }[] = [
  { label: "Received", stages: ["Received/booked"] },
  { label: "Cut-up", stages: ["Waiting for dissection/cut-up"] },
  { label: "Decalc.", stages: ["Decalcification"] },
  { label: "Processor", stages: ["Awaiting processor or processing"] },
  { label: "Embedding", stages: ["Embedding"] },
  { label: "Microtomy", stages: ["Microtomy"] },
  { label: "H&E", stages: ["H&E staining"] },
  { label: "Scanning", stages: ["Scanning"] },
  { label: "IQC", stages: ["IQC"] },
  { label: "Ready", stages: ["Ready for pathologist handoff"] },
];

const colOf = (stage: string | null) => COLUMNS.findIndex((c) => stage !== null && c.stages.includes(stage));

/** The caption, computed from the blocks and the estimate; never hard-coded. */
export function spotlightCaption(d: CaseDetail): string {
  const cols = [...new Set(d.blocks.map((b) => colOf(b.stage)))];
  if (cols.length > 1 && d.estimate.status === "unknown") {
    const behind = Math.min(...cols);
    const ids = d.blocks.filter((b) => colOf(b.stage) === behind).map((b) => b.blockId);
    return `No whole-case handoff time yet: ${ids.join(", ")} outstanding.`;
  }
  if (d.estimate.status === "ready") return `Ready for pathologist handoff since ${d.estimate.readyAt}.`;
  if (d.estimate.status === "estimated") return `Handoff estimate ${d.estimate.readyAt}.`;
  return `No handoff time: ${d.estimate.reasonUnknown}`;
}

interface Props {
  caseId: string;
  onClose: () => void;
  /** Story mode supplies its own controls; standalone use closes on click or Esc. */
  embedded?: boolean;
}

/** Dims the lab and shows one case, block by block, at the stage each block has reached. */
export function Spotlight({ caseId, onClose, embedded }: Props) {
  const [d, setD] = useState<CaseDetail | null>(null);

  useEffect(() => {
    let live = true;
    api.case(caseId).then((x) => live && setD(x));
    return () => {
      live = false;
    };
  }, [caseId]);

  useEffect(() => {
    if (embedded) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [embedded, onClose]);

  const cols = d ? [...new Set(d.blocks.map((b) => colOf(b.stage)))] : [];
  const behind = cols.length > 1 ? Math.min(...cols) : -2;
  const shown = COLUMNS.filter((c, i) => c.label !== "Decalc." || cols.includes(i));

  return (
    <motion.div
      className="spotlight-scrim"
      onClick={(e) => {
        e.stopPropagation(); // don't also close the drawer underneath
        if (!embedded) onClose();
      }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      {d && (
        <motion.div
          className="spotlight-card"
          onClick={(e) => e.stopPropagation()}
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          role="dialog"
          aria-label={`Spotlight on ${d.caseId}`}
        >
          <header className="spot-head">
            <span className="mono spot-id">{d.caseId}</span>
            <span className="spot-sub">
              {d.specimen} · {d.blocks.length} block{d.blocks.length === 1 ? "" : "s"} · recorded stage: {d.stage}
            </span>
          </header>
          <div className="spot-grid" style={{ gridTemplateColumns: `repeat(${shown.length}, minmax(0, 1fr))` }}>
            {shown.map((c) => (
              <div key={c.label} className="spot-col">
                <span className="spot-col-label">{c.label}</span>
              </div>
            ))}
            {d.blocks.map((b, i) => {
              const col = shown.findIndex((c) => b.stage !== null && c.stages.includes(b.stage));
              const isBehind = colOf(b.stage) === behind;
              const rowInCol = d.blocks.slice(0, i).filter((x) => x.stage === b.stage).length;
              return (
                <motion.span
                  key={b.blockId}
                  className={`spot-chip mono ${isBehind ? "behind" : "ahead"}`}
                  style={{ gridColumn: col + 1, gridRow: 2 + rowInCol }}
                  title={`${b.blockId}: ${b.location}; ${b.status}`}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: 0.25 + i * 0.05 }}
                >
                  {b.blockId}
                </motion.span>
              );
            })}
          </div>
          <motion.p className="spot-caption" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.55, duration: 0.3 }}>
            {spotlightCaption(d)}
          </motion.p>
          <p className="spot-detail">
            {[...new Map(d.blocks.map((b) => [`${b.location}; ${b.status}`, d.blocks.filter((x) => `${x.location}; ${x.status}` === `${b.location}; ${b.status}`).map((x) => x.blockId)])).entries()].map(([where, ids]) => (
              <span key={where}>
                <span className="mono">{ids.length > 2 ? `${ids[0]}–${ids.at(-1)}` : ids.join(", ")}</span>: {where}
              </span>
            ))}
          </p>
          {!embedded && (
            <button className="btn-quiet" onClick={onClose}>
              Close
            </button>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}
