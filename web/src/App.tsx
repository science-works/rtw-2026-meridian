import { useCallback, useEffect, useRef, useState } from "react";
import type { Stage } from "../../shared/types";
import { api } from "./api";
import { AttentionQueue } from "./components/AttentionQueue";
import { CaseDrawer } from "./components/CaseDrawer";
import { CaseTable } from "./components/CaseTable";
import { ControlBar, Header, type Tab } from "./components/Header";
import { LabFlow } from "./flow/LabFlow";
import { StationDrawer } from "./flow/StationDrawer";
import { HeadlineCounts, type CaseScope } from "./components/HeadlineCounts";
import { Pipeline } from "./components/Pipeline";
import { Ripple } from "./components/Ripple";
import { useFx } from "./fx";
import { StoryMode } from "./story/StoryMode";
import { AgentBeam } from "./agent/AgentBeam";
import { AgentConsole } from "./agent/AgentConsole";
import { useLive } from "./useLive";

const PULSE_MS = 900;

export function App() {
  const live = useLive();
  const fx = useFx();
  const [stage, setStage] = useState<Stage | null>(null);
  const [tab, setTab] = useState<Tab>("Overview");
  const [scope, setScope] = useState<CaseScope>("demo");
  const [openStation, setOpenStation] = useState<string | null>(null);
  const [openCase, setOpenCase] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [pulse, setPulse] = useState<Set<string>>(new Set());
  const [ripple, setRipple] = useState<{ label: string; key: number } | null>(null);
  const [story, setStory] = useState(0); // 0 = off; otherwise a run counter so each run starts fresh
  const [wakeKey, setWakeKey] = useState(0);
  const wake = useCallback(() => setWakeKey((k) => k + 1), []);
  const exitStory = useCallback(() => setStory(0), []);
  const [agentGlow, setAgentGlow] = useState<Set<string>>(new Set());
  const [beam, setBeam] = useState<{ caseIds: string[]; key: number } | null>(null);
  const clearBeam = useCallback(() => setBeam(null), []);
  const lastActivity = useRef(0);

  // Each new agent read: outline the cases it touched for 1.5 s and draw one beam into them.
  useEffect(() => {
    const latest = live.activity.at(-1);
    if (!latest || latest.id <= lastActivity.current) return;
    const first = lastActivity.current === 0 && live.activity.length > 1; // initial backlog on page load: no effects
    lastActivity.current = latest.id;
    if (first || latest.caseIds.length === 0) return;
    setAgentGlow(new Set(latest.caseIds));
    if (fx.on) setBeam({ caseIds: latest.caseIds, key: latest.id });
    const t = setTimeout(() => setAgentGlow(new Set()), 1500);
    return () => clearTimeout(t);
  }, [live.activity, fx.on]);
  const seenAlerts = useRef<Set<string> | null>(null);

  // Pulse (once) whatever the server newly flagged: new alert cards and their cases.
  useEffect(() => {
    if (!live.overview) return; // nothing loaded yet: the first real alert set is the baseline, not news
    const ids = new Set(live.alerts.map((a) => a.id));
    const prev = seenAlerts.current;
    seenAlerts.current = ids;
    if (!prev || !fx.on) return;
    const fresh = live.alerts.filter((a) => !prev.has(a.id));
    if (fresh.length === 0) return;
    setPulse(new Set([...fresh.map((a) => a.id), ...fresh.flatMap((a) => a.caseIds)]));
    const basket = fresh.find((a) => a.kind === "basket_failure");
    if (basket) setRipple({ label: `${basket.slideIds?.length ?? 0} slides · ${basket.caseIds.length} cases`, key: Date.now() });
    const t = setTimeout(() => setPulse(new Set()), PULSE_MS + 100);
    return () => clearTimeout(t);
  }, [live.alerts, live.overview, fx.on]);

  const clearRipple = useCallback(() => setRipple(null), []);

  const run = useCallback(async (fn: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  }, []);

  const search = useCallback(async (id: string) => {
    try {
      await api.case(id);
      setOpenCase(id);
      return true;
    } catch {
      return false;
    }
  }, []);

  const o = live.overview;
  return (
    <div className={`app ${fx.on ? "fx" : "no-fx"} ${tab === "Overview" ? "" : "tab-other"}`}>
      <Header
        overview={o}
        connected={live.connected}
        tab={tab}
        onTab={setTab}
        onSearch={search}
      />
      {live.error && <p className="error banner">Cannot reach the Meridian API ({live.error}). Is `npm run dev` running?</p>}
      {tab === "Overview" && (
        <>
          {o && <HeadlineCounts overview={o} scope={scope} onScope={(s) => (setScope(s), setStage(null))} />}
          {o && <Pipeline overview={o} cases={live.cases} alerts={live.alerts} selected={stage} onSelect={setStage} pulse={pulse} wakeKey={wakeKey} glow={agentGlow} />}
          <main className="main">
            <CaseTable
              cases={live.cases}
              alerts={live.alerts}
              stage={stage}
              scope={scope}
              onScope={setScope}
              onClearStage={() => setStage(null)}
              onOpenCase={setOpenCase}
              pulse={pulse}
              glow={agentGlow}
            />
            <div className="right-col">
              <AttentionQueue alerts={live.alerts} onOpenCase={setOpenCase} pulse={pulse} />
              <AgentConsole activity={live.activity} onOpenCase={setOpenCase} onClear={() => void api.clearAgent()} />
            </div>
          </main>
        </>
      )}
      {tab === "Lab flow" && <LabFlow stations={live.stations} cases={live.cases} alerts={live.alerts} onOpenStation={setOpenStation} onOpenCase={setOpenCase} />}
      {tab === "Screening" && (
        <section className="tab-page">
          <h2>Screening-linked cases</h2>
          <p>
            {o ? `${o.screeningLinked} cases carry a BCSP or cervical-screening tag.` : ""} Times refer to lab handoff to the pathologist only, never the programme deadline. Open the
            &ldquo;Screening-linked&rdquo; count on Overview for the filterable list.
          </p>
        </section>
      )}
      {tab === "Diagnostic cytopathology" && (
        <section className="tab-page">
          <h2>Diagnostic cytopathology</h2>
          <div className="empty-state">No cases received today (cell blocks and clots).</div>
          <p>This simulated day contains no diagnostic cytopathology work. Search the mock archive by case ID from the search box.</p>
        </section>
      )}
      {tab === "Archive" && (
        <section className="tab-page">
          <h2>Archive</h2>
          <p>Search by case ID with the search box above. It searches the fictional demo workbook only, never real patient records.</p>
        </section>
      )}
      <ControlBar
        overview={o}
        busy={busy || story > 0}
        onTrigger={() => run(api.trigger)}
        onReset={() => run(api.reset)}
        onStory={() => {
          setOpenCase(null);
          setOpenStation(null);
          setTab("Overview");
          setStory((n) => n + 1);
        }}
      />
      {ripple && <Ripple key={ripple.key} from='.lane[data-stage="H&E staining"]' label={ripple.label} onDone={clearRipple} />}
      {beam && <AgentBeam key={beam.key} caseIds={beam.caseIds} onDone={clearBeam} />}
      {story > 0 && <StoryMode key={story} overview={o} alerts={live.alerts} activity={live.activity} onWake={wake} onExit={exitStory} />}
      {openStation && live.stations.find((x) => x.id === openStation) && (
        <StationDrawer card={live.stations.find((x) => x.id === openStation)!} cases={live.cases} onClose={() => setOpenStation(null)} onOpenCase={setOpenCase} />
      )}
      {openCase && <CaseDrawer caseId={openCase} version={live.version} alerts={live.alerts} onClose={() => setOpenCase(null)} onOpenCase={setOpenCase} />}
    </div>
  );
}
