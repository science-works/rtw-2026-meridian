import { useCallback, useEffect, useRef, useState } from "react";
import type { Stage } from "../../shared/types";
import { api } from "./api";
import { AttentionQueue } from "./components/AttentionQueue";
import { CaseDrawer } from "./components/CaseDrawer";
import { CaseTable } from "./components/CaseTable";
import { Header } from "./components/Header";
import { Pipeline } from "./components/Pipeline";
import { Ripple } from "./components/Ripple";
import { useFx } from "./fx";
import { StoryMode } from "./story/StoryMode";
import { useLive } from "./useLive";

const PULSE_MS = 900;

export function App() {
  const live = useLive();
  const [stage, setStage] = useState<Stage | null>(null);
  const [openCase, setOpenCase] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [pulse, setPulse] = useState<Set<string>>(new Set());
  const [ripple, setRipple] = useState<{ label: string; key: number } | null>(null);
  const [story, setStory] = useState(0); // 0 = off; otherwise a run counter so each run starts fresh
  const [wakeKey, setWakeKey] = useState(0);
  const wake = useCallback(() => setWakeKey((k) => k + 1), []);
  const exitStory = useCallback(() => setStory(0), []);
  const seenAlerts = useRef<Set<string> | null>(null);
  const fx = useFx();

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

  return (
    <div className={`app ${fx.on ? "fx" : "no-fx"}`}>
      <Header
        overview={live.overview}
        connected={live.connected}
        busy={busy || story > 0}
        onTrigger={() => run(api.trigger)}
        onReset={() => run(api.reset)}
        onStory={() => {
          setOpenCase(null);
          setStory((n) => n + 1);
        }}
      />
      {live.error && <p className="error banner">Cannot reach the Meridian API ({live.error}). Is `npm run dev` running?</p>}
      {live.overview && <Pipeline overview={live.overview} cases={live.cases} alerts={live.alerts} selected={stage} onSelect={setStage} pulse={pulse} wakeKey={wakeKey} />}
      <main className="main">
        <CaseTable cases={live.cases} alerts={live.alerts} stage={stage} onClearStage={() => setStage(null)} onOpenCase={setOpenCase} pulse={pulse} />
        <AttentionQueue alerts={live.alerts} onOpenCase={setOpenCase} pulse={pulse} />
      </main>
      <footer className="footer">
        Meridian is designed to sit alongside a LIMS. We're simulating the lab's feeds in this demo; a live version would connect through the interfaces available at each lab. It
        predicts when a case should be ready for the pathologist; it never diagnoses, reports or predicts screening deadlines.
      </footer>
      {ripple && <Ripple key={ripple.key} from='.lane[data-stage="H&E staining"]' label={ripple.label} onDone={clearRipple} />}
      {story > 0 && <StoryMode key={story} overview={live.overview} alerts={live.alerts} onWake={wake} onExit={exitStory} />}
      {openCase && <CaseDrawer caseId={openCase} version={live.version} alerts={live.alerts} onClose={() => setOpenCase(null)} onOpenCase={setOpenCase} />}
    </div>
  );
}
