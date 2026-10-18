// Motion Pack switches. Approved effects are on by default (DEFAULT_ON). For this browser tab,
// ?fx=all or ?fx=1,2,3 picks effects, ?fx=none turns them all off, ?fx=default restores the defaults
// (kept in sessionStorage so it survives navigation).
// Reduced motion, VITE_FX=off and "Skip animations" still turn every effect off (see useFx).
import { useFx } from "./fx";

export type FxId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11;
export const FX_NAMES: Record<FxId, string> = {
  1: "Flag → incident morph",
  2: "Acknowledge: settle, fly to Incidents, count ticks",
  3: "Case journey draws on",
  4: "Simulation 10:45 shockwave, slide flash, queue glow",
  5: "Dashboard wakes up (first load per session)",
  6: "Page transitions",
  7: "Agent console beam",
  8: "Magic Card spotlight on dashboard tiles and the station header (hover only)",
  9: "Border Beam on the urgent card and the incident flag (slow loop)",
  10: "Shine Border once when a case is ready for the pathologist",
  11: "Animated List: incident rows and timeline entries enter in turn",
};
/** Approved effects, on without ?fx (approved 1–7). 8–11 are Magic UI extras, preview with ?fx=8,9,10,11. */
const DEFAULT_ON: FxId[] = [1, 2, 3, 4, 5, 6, 7];
const KEY = "meridian.fx";

function read(): Set<FxId> {
  let raw: string | null = null;
  try {
    const q = new URLSearchParams(window.location.search).get("fx");
    if (q !== null) {
      if (q === "default" || q === "") sessionStorage.removeItem(KEY);
      else sessionStorage.setItem(KEY, q);
    }
    raw = sessionStorage.getItem(KEY);
  } catch {
    raw = new URLSearchParams(window.location.search).get("fx");
  }
  if (!raw) return new Set(DEFAULT_ON);
  if (raw === "none" || raw === "off") return new Set();
  if (raw === "all") return new Set(Object.keys(FX_NAMES).map(Number) as FxId[]);
  return new Set([...raw.split(",").map((s) => Number(s.trim())).filter((n): n is FxId => n in FX_NAMES)]);
}

const flags = typeof window === "undefined" ? new Set<FxId>() : read();

/** True when effect n is switched on (independent of reduced motion; combine with useFx().on). */
export const fxFlag = (n: FxId) => flags.has(n);

/** Effect n is on and motion is allowed. */
export function useFxFlag(n: FxId): boolean {
  const fx = useFx();
  return fx.on && flags.has(n);
}

/** For non-React code: also checks reduced motion and the skip toggle at call time. */
export function fxActive(n: FxId): boolean {
  if (!flags.has(n)) return false;
  if (import.meta.env.VITE_FX === "off") return false;
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return false;
  try {
    if (localStorage.getItem("meridian.skipAnimations") === "1") return false;
  } catch {
    /* storage blocked: treat as not skipped */
  }
  return true;
}
