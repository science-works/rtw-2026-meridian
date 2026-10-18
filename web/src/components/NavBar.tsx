import type { Overview } from "../../../shared/types";
import { CaseSearch } from "../pages/Dashboard";
import { Link, paths } from "../router";
import { Logo } from "./Logo";

const NAV: { to: string; label: string; match: (p: string) => boolean }[] = [
  { to: paths.dashboard, label: "Dashboard", match: (p) => p === "/" || p.startsWith("/section") },
  { to: paths.simulation, label: "Simulation", match: (p) => p.startsWith("/simulation") },
  { to: paths.simulator, label: "Simulator (detailed)", match: (p) => p.startsWith("/simulator") || p.startsWith("/station") },
  { to: paths.incidents, label: "Incidents", match: (p) => p.startsWith("/incident") },
];

const DAY: Record<string, string> = { "-1": "Previous working day", "0": "Monday", "1": "Tuesday" };
const clockLabel = (clock: string) => {
  const m = /^Day (-?\d+) (\d\d:\d\d)$/.exec(clock);
  return m ? `${DAY[m[1]] ?? `Day ${m[1]}`} ${m[2]}` : clock;
};

/** Global navigation: logo placeholder, four sections, search always visible, fixed clock, SIMULATED. */
export function NavBar({ path, overview, connected }: { path: string; overview: Overview | null; connected: boolean }) {
  return (
    <header className="topbar">
      <Logo />
      <nav className="tabs" aria-label="Sections">
        {NAV.map((n) => (
          <Link key={n.to} to={n.to} className={`tab ${n.match(path) ? "on" : ""}`} aria-current={n.match(path) ? "page" : undefined}>
            {n.label}
          </Link>
        ))}
      </nav>
      <CaseSearch />
      <div className="clock" title="Fixed simulated clock">
        <span className="mono clock-time">{overview ? clockLabel(overview.clock) : "…"}</span>
        <span className={`live ${connected ? "on" : "off"}`}>{connected ? "simulated feed" : "reconnecting"}</span>
      </div>
      <span className="badge-sim" title="Fictional dataset; not connected to any laboratory">
        SIMULATED
      </span>
    </header>
  );
}
