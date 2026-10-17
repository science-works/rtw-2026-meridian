import { AnimatePresence, motion } from "motion/react";
import type { Alert } from "../../../shared/types";
import { AlertCard } from "./AlertCard";
import { Count } from "./Flow";

interface Props {
  alerts: Alert[];
  onOpenCase: (id: string) => void;
  pulse: Set<string>;
}

const ORDER = { high: 0, medium: 1 } as const;

/** Alerts slide in one by one (newest and most severe first); the rest make room. */
export function AttentionQueue({ alerts, onOpenCase, pulse }: Props) {
  const sorted = [...alerts].sort((a, b) => ORDER[a.severity] - ORDER[b.severity] || b.raisedAt.localeCompare(a.raisedAt));
  const nCases = new Set(alerts.flatMap((a) => a.caseIds)).size;
  return (
    <aside className="queue" aria-label="Attention queue">
      <header className="queue-head">
        <h2>Attention queue</h2>
        <span className="queue-count">
          <Count className="mono" value={alerts.length} /> alerts · <Count className="mono" value={nCases} /> cases
        </span>
      </header>
      <p className="queue-note">Rules flag; staff decide. Meridian never changes a case.</p>
      <div className="queue-list">
        <AnimatePresence initial>
          {sorted.map((a, i) => (
            <motion.div
              key={a.id}
              layout
              initial={{ opacity: 0, y: -18 }}
              animate={{ opacity: 1, y: 0, transition: { duration: 0.35, delay: Math.min(i * 0.12, 0.5) } }}
              exit={{ opacity: 0, transition: { duration: 0.2 } }}
              transition={{ layout: { duration: 0.35 } }}
            >
              <AlertCard alert={a} onOpenCase={onOpenCase} pulse={pulse.has(a.id)} compact />
            </motion.div>
          ))}
        </AnimatePresence>
        {alerts.length === 0 && <p className="muted">No active alerts.</p>}
      </div>
    </aside>
  );
}
