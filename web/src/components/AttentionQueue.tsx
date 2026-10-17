import type { Alert } from "../../../shared/types";
import { AlertCard } from "./AlertCard";

interface Props {
  alerts: Alert[];
  onOpenCase: (id: string) => void;
  pulse: Set<string>;
}

const ORDER = { high: 0, medium: 1 } as const;

export function AttentionQueue({ alerts, onOpenCase, pulse }: Props) {
  const sorted = [...alerts].sort((a, b) => ORDER[a.severity] - ORDER[b.severity] || b.raisedAt.localeCompare(a.raisedAt));
  const nCases = new Set(alerts.flatMap((a) => a.caseIds)).size;
  return (
    <aside className="queue" aria-label="Attention queue">
      <header className="queue-head">
        <h2>Attention queue</h2>
        <span className="queue-count">
          <span className="mono">{alerts.length}</span> alerts · <span className="mono">{nCases}</span> cases
        </span>
      </header>
      <p className="queue-note">Rules flag; staff decide. Meridian never changes a case.</p>
      <div className="queue-list">
        {sorted.map((a) => (
          <AlertCard key={a.id} alert={a} onOpenCase={onOpenCase} pulse={pulse.has(a.id)} compact />
        ))}
        {alerts.length === 0 && <p className="muted">No active alerts.</p>}
      </div>
    </aside>
  );
}
