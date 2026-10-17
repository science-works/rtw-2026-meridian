import { useFx } from "../fx";
import { useState } from "react";
import { SearchIcon } from "../theme/icons";
import type { Overview } from "../../../shared/types";

export const TABS = ["Overview", "Lab flow", "Screening", "Diagnostic cytopathology", "Archive"] as const;
export type Tab = (typeof TABS)[number];

interface Props {
  overview: Overview | null;
  connected: boolean;
  tab: Tab;
  onTab: (t: Tab) => void;
  /** Returns false when the case ID is not in the simulated dataset. */
  onSearch: (caseId: string) => Promise<boolean>;
}

const DAY_NAMES: Record<string, string> = { "-1": "Previous working day", "0": "Monday", "1": "Tuesday" };

function clockLabel(clock: string) {
  const m = /^Day (-?\d+) (\d\d:\d\d)$/.exec(clock);
  return m ? `${DAY_NAMES[m[1]] ?? `Day ${m[1]}`} ${m[2]}` : clock;
}

/** Top bar (spec Screen A): identity, tabs, case search, fixed simulated clock, SIMULATED badge. */
export function Header({ overview, connected, tab, onTab, onSearch }: Props) {
  const [q, setQ] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = q.trim().toUpperCase();
    if (!id) return;
    const found = await onSearch(id);
    setMsg(found ? null : `No case ${id} in the simulated dataset`);
  };

  return (
    <header className="topbar">
      <div className="brand">
        <span className="wordmark">MERIDIAN</span>
        <span className="sublabel">CellPath lab workflow assistant</span>
      </div>
      <nav className="tabs" aria-label="Sections">
        {TABS.map((t) => (
          <button key={t} className={`tab ${t === tab ? "on" : ""}`} onClick={() => onTab(t)} aria-current={t === tab ? "page" : undefined}>
            {t}
          </button>
        ))}
      </nav>
      <form className="search-box" onSubmit={submit} role="search">
        <SearchIcon />
        <input value={q} onChange={(e) => (setQ(e.target.value), setMsg(null))} placeholder="Case ID, e.g. 26H2345" aria-label="Search case ID" />
        {msg && <span className="search-msg">{msg}</span>}
      </form>
      <div className="clock" aria-label="Simulated clock (fixed)" title="Fixed simulated clock">
        <span className="mono clock-time">{overview ? clockLabel(overview.clock) : "…"}</span>
        <span className={`live ${connected ? "on" : "off"}`}>{connected ? "● simulated feed" : "○ reconnecting"}</span>
      </div>
      <span className="badge-sim" title="Fictional dataset; not connected to any laboratory">
        SIMULATED
      </span>
    </header>
  );
}

interface ControlProps {
  overview: Overview | null;
  busy: boolean;
  onTrigger: () => void;
  onReset: () => void;
}

/** Presenter controls plus the boundary sentence, in one bottom bar so the top bar fits a projector. */
export function ControlBar({ overview, busy, onTrigger, onReset }: ControlProps) {
  const fx = useFx();
  return (
    <footer className="footer">
      <p className="footer-text">
        The agent reads case events from the lab&apos;s existing workflow and information systems. We&apos;re simulating those feeds in this demo; a live version would connect through
        the interfaces available at each lab. Lab preparation to pathologist handoff only: no diagnosis, reporting or screening deadlines.
      </p>
      <div className="demo-controls" aria-label="Demo controls">
        <button className="btn-trigger" onClick={onTrigger} disabled={busy || !overview || overview.triggerFired}>
          {overview?.triggerFired ? "H&E incident replayed" : "Replay H&E incident"}
        </button>
        <button className="btn-quiet" onClick={onReset} disabled={busy}>
          Reset demo
        </button>
        <label className="fx-toggle" title={fx.reason === "env" ? "Effects are off (VITE_FX=off)" : fx.reason === "reduced" ? "Effects are off (reduced motion is set)" : undefined}>
          <input type="checkbox" checked={!fx.on} disabled={fx.reason === "env" || fx.reason === "reduced"} onChange={(e) => fx.setSkip(e.target.checked)} /> Skip animations
        </label>
      </div>
    </footer>
  );
}
