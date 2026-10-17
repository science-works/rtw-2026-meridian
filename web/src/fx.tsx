// Effects switch. Every effect is off when VITE_FX=off, when the viewer prefers reduced
// motion, or when the presenter ticks "Skip animations". The dashboard works the same either way.
import { MotionConfig } from "motion/react";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export const FX_ENV_ON = import.meta.env.VITE_FX !== "off";
const SKIP_KEY = "meridian.skipAnimations";

export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

function readSkip(): boolean {
  try {
    return localStorage.getItem(SKIP_KEY) === "1";
  } catch {
    return false;
  }
}

interface Fx {
  /** True when effects may run. */
  on: boolean;
  /** Why effects are off, for the toggle's label. */
  reason: "env" | "reduced" | "skip" | null;
  skip: boolean;
  setSkip: (v: boolean) => void;
}

const FxContext = createContext<Fx>({ on: false, reason: "env", skip: false, setSkip: () => {} });

export function FxProvider({ children }: { children: ReactNode }) {
  const [skip, setSkipState] = useState(readSkip);
  const [reduced, setReduced] = useState(prefersReducedMotion);

  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!mq) return;
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const setSkip = (v: boolean) => {
    setSkipState(v);
    try {
      localStorage.setItem(SKIP_KEY, v ? "1" : "0");
    } catch {
      /* storage unavailable: the toggle still works for this session */
    }
  };

  const reason = !FX_ENV_ON ? "env" : reduced ? "reduced" : skip ? "skip" : null;
  const on = reason === null;
  return (
    <FxContext.Provider value={{ on, reason, skip, setSkip }}>
      <MotionConfig reducedMotion={on ? "never" : "always"} transition={on ? undefined : { duration: 0 }}>
        {children}
      </MotionConfig>
    </FxContext.Provider>
  );
}

export const useFx = () => useContext(FxContext);
