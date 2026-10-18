import { useCallback, useState } from "react";
import { AgentConsole } from "./agent/AgentConsole";
import { api } from "./api";
import { ChatDock } from "./components/ChatDock";
import { ControlBar } from "./components/Header";
import { NavBar } from "./components/NavBar";
import { LabFlow } from "./flow/LabFlow";
import { useFx } from "./fx";
import { CasePage } from "./pages/CasePage";
import { Dashboard } from "./pages/Dashboard";
import { IncidentPage } from "./pages/IncidentPage";
import { IncidentsPage } from "./pages/IncidentsPage";
import { LimsView } from "./pages/LimsView";
import { SectionPage } from "./pages/SectionPage";
import { COMPARE_DEFAULT, ComparePage } from "./pages/ComparePage";
import { PresenterPage } from "./pages/PresenterPage";
import { SimulationPage } from "./pages/SimulationPage";
import { StationPage } from "./pages/StationPage";
import { match, navigate, paths, usePath } from "./router";
import { StoryBar } from "./story/StoryBar";
import { useLive } from "./useLive";

/** Meridian v8 (Victoria's design): real pages, one shared live state, the incident dock on every page. */
export function App() {
  const live = useLive();
  const fx = useFx();
  const path = usePath();
  const [busy, setBusy] = useState(false);
  const [story, setStory] = useState(() => typeof location !== "undefined" && new URLSearchParams(location.search).has("story"));
  const run = useCallback(async (fn: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  }, []);

  const o = live.overview;
  // Speaker notes stand alone: no nav, chat or agent console.
  if (path === "/presenter") return <PresenterPage />;
  let page: React.ReactNode = <p className="page muted">Loading…</p>;
  let m: Record<string, string> | null = null;
  if (o) {
    if (path === "/") page = <Dashboard overview={o} cases={live.cases} alerts={live.alerts} />;
    else if (path === "/lims-view") page = <LimsView version={live.version} />;
    else if (path === "/compare" || (m = match("/compare/:id", path))) page = <ComparePage caseId={(m?.id ?? COMPARE_DEFAULT).toUpperCase()} alerts={live.alerts} version={live.version} />;
    else if ((m = match("/case/:id", path))) page = <CasePage caseId={m.id.toUpperCase()} version={live.version} alerts={live.alerts} />;
    else if (path === "/incidents") page = <IncidentsPage alerts={live.alerts} />;
    else if ((m = match("/incident/:id", path))) page = <IncidentPage id={m.id} alerts={live.alerts} cases={live.cases} stations={live.stations} />;
    else if ((m = match("/section/:name", path))) page = <SectionPage name={m.name} cases={live.cases} alerts={live.alerts} overview={o} />;
    else if ((m = match("/station/:id", path))) page = <StationPage id={m.id} stations={live.stations} cases={live.cases} alerts={live.alerts} />;
    else if (path === "/simulator")
      page = (
        <LabFlow stations={live.stations} cases={live.cases} alerts={live.alerts} onOpenStation={(id) => navigate(paths.station(id))} onOpenCase={(id) => navigate(paths.case(id))} />
      );
    else if (path === "/simulation") page = <SimulationPage alerts={live.alerts} />;
    else page = <section className="page"><h1>Not found</h1><p className="empty-state">No page at {path}.</p></section>;
  }

  return (
    <div className={`app ${fx.on ? "fx" : "no-fx"}`}>
      <NavBar path={path} overview={o} connected={live.connected} />
      {live.error && <p className="error banner">Cannot reach the Meridian API ({live.error}). Is `npm run dev` running?</p>}
      <main className="page-wrap">{page}</main>
      <ControlBar
        busy={busy}
        onReset={() => run(api.reset)}
        story={<StoryBar active={story} onActive={setStory} />}
        storyActive={story}
        onStory={() => setStory(true)}
        agent={<AgentConsole activity={live.activity} onOpenCase={(id) => navigate(paths.case(id))} onClear={() => void api.clearAgent()} />}
      />
      <ChatDock />
    </div>
  );
}
