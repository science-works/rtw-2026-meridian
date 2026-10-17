import { useCallback, useState } from "react";
import { AgentConsole } from "./agent/AgentConsole";
import { api } from "./api";
import { Dock } from "./components/Dock";
import { ControlBar } from "./components/Header";
import { NavBar } from "./components/NavBar";
import { LabFlow } from "./flow/LabFlow";
import { useFx } from "./fx";
import { CasePage } from "./pages/CasePage";
import { Dashboard } from "./pages/Dashboard";
import { IncidentPage } from "./pages/IncidentPage";
import { IncidentsPage } from "./pages/IncidentsPage";
import { SectionPage } from "./pages/SectionPage";
import { StationPage } from "./pages/StationPage";
import { match, navigate, paths, usePath } from "./router";
import { useLive } from "./useLive";

/** Meridian v8 (Victoria's design): real pages, one shared live state, the incident dock on every page. */
export function App() {
  const live = useLive();
  const fx = useFx();
  const path = usePath();
  const [busy, setBusy] = useState(false);
  const run = useCallback(async (fn: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  }, []);

  const o = live.overview;
  const open = live.alerts.filter((a) => a.state !== "resolved").length;
  let page: React.ReactNode = <p className="page muted">Loading…</p>;
  let m: Record<string, string> | null;
  if (o) {
    if (path === "/") page = <Dashboard overview={o} cases={live.cases} openIncidents={open} />;
    else if ((m = match("/case/:id", path))) page = <CasePage caseId={m.id.toUpperCase()} version={live.version} alerts={live.alerts} />;
    else if (path === "/incidents") page = <IncidentsPage alerts={live.alerts} />;
    else if ((m = match("/incident/:id", path))) page = <IncidentPage id={m.id} alerts={live.alerts} cases={live.cases} stations={live.stations} />;
    else if ((m = match("/section/:name", path))) page = <SectionPage name={m.name} cases={live.cases} alerts={live.alerts} overview={o} />;
    else if ((m = match("/station/:id", path))) page = <StationPage id={m.id} stations={live.stations} cases={live.cases} alerts={live.alerts} />;
    else if (path === "/simulator")
      page = (
        <LabFlow stations={live.stations} cases={live.cases} alerts={live.alerts} onOpenStation={(id) => navigate(paths.station(id))} onOpenCase={(id) => navigate(paths.case(id))} />
      );
    else if (path === "/simulation") page = <section className="page"><h1>Simulation</h1><p className="empty-state">The light simulation of the histology lab is being built (P2). The detailed simulator shows the same live data.</p></section>;
    else page = <section className="page"><h1>Not found</h1><p className="empty-state">No page at {path}.</p></section>;
  }

  return (
    <div className={`app ${fx.on ? "fx" : "no-fx"}`}>
      <NavBar path={path} overview={o} connected={live.connected} />
      {live.error && <p className="error banner">Cannot reach the Meridian API ({live.error}). Is `npm run dev` running?</p>}
      <main className="page-wrap">{page}</main>
      <Dock alerts={live.alerts} />
      <ControlBar overview={o} busy={busy} onTrigger={() => run(api.trigger)} onReset={() => run(api.reset)} />
      {path === "/simulator" && (
        <div className="agent-float">
          <AgentConsole activity={live.activity} onOpenCase={(id) => navigate(paths.case(id))} onClear={() => void api.clearAgent()} />
        </div>
      )}
    </div>
  );
}
