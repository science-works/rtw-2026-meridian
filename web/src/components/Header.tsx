import type { Overview } from "../../../shared/types";

interface Props {
  overview: Overview | null;
  connected: boolean;
  busy: boolean;
  onTrigger: () => void;
  onReset: () => void;
}

const DAY_NAMES: Record<string, string> = { "-1": "Previous working day", "0": "Monday", "1": "Tuesday" };

function clockLabel(clock: string) {
  const m = /^Day (-?\d+) (\d\d:\d\d)$/.exec(clock);
  return m ? `${DAY_NAMES[m[1]] ?? `Day ${m[1]}`} ${m[2]}` : clock;
}

export function Header({ overview, connected, busy, onTrigger, onReset }: Props) {
  const tiles = overview
    ? [
        { label: "Tracked cases", value: overview.total },
        { label: "Previous-day backlog", value: overview.backlog },
        { label: "Current-day workload", value: overview.today },
        { label: "Ready for pathologist", value: overview.ready, tone: "teal" },
      ]
    : [];
  return (
    <header className="header">
      <div className="brand">
        <h1>Meridian</h1>
        <p className="tagline">Every case, every station, mapped live.</p>
      </div>
      <div className="clock" aria-label="Simulated clock">
        <span className="clock-label">Simulated clock</span>
        <span className="mono clock-time">{overview ? clockLabel(overview.clock) : "…"}</span>
        <span className={`live ${connected ? "on" : "off"}`}>{connected ? "● live" : "○ reconnecting"}</span>
      </div>
      <span className="badge-sim" title="Fictional dataset; not connected to any laboratory">
        SIMULATED DATA
      </span>
      <div className="tiles">
        {tiles.map((t) => (
          <div key={t.label} className={`tile ${t.tone ?? ""}`}>
            <span className="tile-value mono">{t.value}</span>
            <span className="tile-label">{t.label}</span>
          </div>
        ))}
      </div>
      <div className="demo-controls" aria-label="Demo controls">
        <button className="btn-trigger" onClick={onTrigger} disabled={busy || !overview || overview.triggerFired}>
          {overview?.triggerFired ? "Stainer failure triggered" : "Trigger stainer basket failure"}
        </button>
        <button className="btn-quiet" onClick={onReset} disabled={busy}>
          Reset demo
        </button>
      </div>
    </header>
  );
}
