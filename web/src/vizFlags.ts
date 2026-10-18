// Insight visuals switches: approved visuals are on by default. For this browser tab, ?viz=all or
// ?viz=1,3 turns them on, ?viz=none turns them off, ?viz=default restores the defaults (sessionStorage).
export type VizId = 1 | 2 | 3 | 4 | 5;
export const VIZ_NAMES: Record<VizId, string> = {
  1: "Life of a biopsy strip",
  2: "How it works (architecture)",
  3: "Where this case sits",
  4: "Lab pulse heatmap",
  5: "Incident blast radius",
};
/** Approved visuals, on without ?viz (approved 1–5). Their animations are static under reduced motion. */
const DEFAULT_ON: VizId[] = [1, 2, 3, 4, 5];
const KEY = "meridian.viz";

function read(): Set<VizId> {
  let raw: string | null = null;
  try {
    const q = new URLSearchParams(window.location.search).get("viz");
    if (q !== null) {
      if (q === "default" || q === "") sessionStorage.removeItem(KEY);
      else sessionStorage.setItem(KEY, q);
    }
    raw = sessionStorage.getItem(KEY);
  } catch {
    raw = new URLSearchParams(window.location.search).get("viz");
  }
  if (!raw) return new Set(DEFAULT_ON);
  if (raw === "none") return new Set();
  if (raw === "all") return new Set(Object.keys(VIZ_NAMES).map(Number) as VizId[]);
  return new Set(raw.split(",").map((s) => Number(s.trim())).filter((n): n is VizId => n in VIZ_NAMES));
}

const flags = typeof window === "undefined" ? new Set<VizId>() : read();
export const vizOn = (n: VizId) => flags.has(n);
