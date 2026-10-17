import { useCallback, useEffect, useRef, useState } from "react";
import type { Stage } from "../../shared/types";
import { api } from "./api";
import { AttentionQueue } from "./components/AttentionQueue";
import { CaseDrawer } from "./components/CaseDrawer";
import { CaseTable } from "./components/CaseTable";
import { Header } from "./components/Header";
import { Pipeline } from "./components/Pipeline";
import { FX_ENV_ON, prefersReducedMotion } from "./fx";
import { useLive } from "./useLive";

const PULSE_MS = 900;

export function App() {
  const live = useLive();
  const [stage, setStage] = useState<Stage | null>(null);
  const [openCase, setOpenCase] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [pulse, setPulse] = useState<Set<string>>(new Set());
  const seenAlerts = useRef<Set<string> | null>(null);

  // Pulse (once) whatever the server newly flagged: new alert cards and their cases.
  useEffect(() => {
    const ids = new Set(live.alerts.map((a) => a.id));
    const prev = seenAlerts.current;
    seenAlerts.current = ids;
    if (!prev || !FX_ENV_ON || prefersReducedMotion()) return;
    const fresh = live.alerts.filter((a) => !prev.has(a.id));
    if (fresh.length === 0) return;
    setPulse(new Set([...fresh.map((a) => a.id), ...fresh.flatMap((a) => a.caseIds)]));
    const t = setTimeout(() => setPulse(new Set()), PULSE_MS + 100);
    return () => clearTimeout(t);
  }, [live.alerts]);

  const run = useCallback(async (fn: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  }, []);

  return (
    <div className={`app ${FX_ENV_ON ? "fx" : "no-fx"}`}>
      <Header overview={live.overview} connected={live.connected} busy={busy} onTrigger={() => run(api.trigger)} onReset={() => run(api.reset)} />
      {live.error && <p className="error banner">Cannot reach the Meridian API ({live.error}). Is `npm run dev` running?</p>}
      {live.overview && <Pipeline overview={live.overview} cases={live.cases} alerts={live.alerts} selected={stage} onSelect={setStage} pulse={pulse} />}
      <main className="main">
        <CaseTable cases={live.cases} alerts={live.alerts} stage={stage} onClearStage={() => setStage(null)} onOpenCase={setOpenCase} pulse={pulse} />
        <AttentionQueue alerts={live.alerts} onOpenCase={setOpenCase} pulse={pulse} />
      </main>
      <footer className="footer">
        Meridian is designed to sit alongside a LIMS. We're simulating the lab's feeds in this demo; a live version would connect through the interfaces available at each lab. It
        predicts when a case should be ready for the pathologist; it never diagnoses, reports or predicts screening deadlines.
      </footer>
      {openCase && <CaseDrawer caseId={openCase} version={live.version} alerts={live.alerts} onClose={() => setOpenCase(null)} onOpenCase={setOpenCase} />}
    </div>
  );
}
