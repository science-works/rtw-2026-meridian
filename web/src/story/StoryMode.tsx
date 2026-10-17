// Story mode: the pitch arc played on the live app. Every number and caption is read
// from the API at the moment it is shown; nothing is recorded or hard-coded.
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Alert, CaseDetail, Overview } from "../../../shared/types";
import { api } from "../api";
import { Spotlight } from "../components/Spotlight";

interface Props {
  overview: Overview | null;
  alerts: Alert[];
  /** Replays the lab-river entrance (step 1). */
  onWake: () => void;
  onExit: () => void;
}

const SPOT_CASE = "26H1003";
const TITLES = ["The lab wakes up", "One block holds a whole case", "A stainer basket fails", "Ask the agent", "Over to you"];

export function StoryMode({ overview, alerts, onWake, onExit }: Props) {
  const [step, setStep] = useState(0);
  const [note, setNote] = useState<string | null>(null);
  const [affected, setAffected] = useState<CaseDetail | null>(null);
  const started = useRef(false);
  const fired = useRef(false);

  // Step 1 entry: restore the initial state so the trigger can run, then replay the river.
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    api.reset().then(onWake);
  }, [onWake]);

  // Step 3 entry: call the real simulator endpoint once per run.
  useEffect(() => {
    if (step !== 2 || fired.current) return;
    fired.current = true;
    api.trigger().then(async (r) => {
      if ("error" in r) setNote(r.error);
      const basket = (await api.alerts()).find((a) => a.kind === "basket_failure");
      if (basket) setAffected(await api.case(basket.caseIds[0]));
    });
  }, [step]);

  const next = useCallback(() => setStep((s) => (s >= TITLES.length - 1 ? s : s + 1)), []);
  const prev = useCallback(() => setStep((s) => Math.max(0, s - 1)), []);

  useEffect(() => {
    if (step === TITLES.length - 1) {
      const t = setTimeout(onExit, 900);
      return () => clearTimeout(t);
    }
  }, [step, onExit]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " " || e.key === "Enter" || e.key === "PageDown") {
        e.preventDefault();
        next();
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        prev();
      } else if (e.key === "Escape") onExit();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev, onExit]);

  const basket = alerts.find((a) => a.kind === "basket_failure");
  const caption = (() => {
    switch (step) {
      case 0:
        return overview
          ? `${overview.total} cases across ${overview.stages.length} stages: ${overview.backlog} carried over from yesterday, ${overview.today} due today, ${overview.ready} ready for the pathologist.`
          : "Loading the lab…";
      case 1:
        return `Spotlight on ${SPOT_CASE}: each block shown where it is.`;
      case 2:
        if (note) return note;
        if (!basket) return "Triggering the simulated stain-run failure…";
        return `${basket.what}. Handoff estimates recalculated${affected?.estimate.readyAt ? `: ${affected.caseId} now ${affected.estimate.readyAt}` : ""}.`;
      case 3:
        return "Ask Claude through MCP: “I'm starting the next shift. What do I need to know?” The agent reads Meridian and explains; it cannot change anything.";
      default:
        return "Back to the live dashboard.";
    }
  })();

  return (
    <>
      <AnimatePresence>{step === 1 && <Spotlight key="spot" caseId={SPOT_CASE} onClose={next} embedded />}</AnimatePresence>
      <motion.div
        className="story-bar"
        role="region"
        aria-label="Story mode"
        onClick={next}
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <div className="story-steps" aria-hidden>
          {TITLES.map((t, i) => (
            <span key={t} className={`story-dot ${i === step ? "on" : i < step ? "done" : ""}`} />
          ))}
        </div>
        <div className="story-text">
          <span className="story-title">
            {step + 1}/{TITLES.length} · {TITLES[step]}
          </span>
          <AnimatePresence mode="wait">
            <motion.span key={caption} className="story-caption" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
              {caption}
            </motion.span>
          </AnimatePresence>
        </div>
        <div className="story-controls" onClick={(e) => e.stopPropagation()}>
          <button className="btn-quiet" onClick={prev} disabled={step === 0} aria-label="Previous step">
            ←
          </button>
          <button className="btn-trigger" onClick={next} aria-label="Next step">
            →
          </button>
          <button className="btn-quiet" onClick={onExit}>
            Exit
          </button>
        </div>
      </motion.div>
    </>
  );
}
