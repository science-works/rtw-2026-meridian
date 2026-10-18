// Design Lab: alternative colour gradings, selectable with ?look=A|B|C (default: the current look).
// Token values only; web/src/looks.css applies them under html[data-look="X"]. Nothing here is the
// default until approved. Red stays urgent-only, warm orange incident-only, purple BCSP, green CSP.
export type LookId = "A" | "B" | "C";

export interface LookTokens {
  name: string;
  /** Page base and raised bars. */
  bg: string;
  bgRaised: string;
  /** Card surface as seen on screen (for glass: the composited colour over the page). */
  card: string;
  card2: string;
  ink: string;
  muted: string;
  line: string;
  accent: string;
  urgent: string;
  attention: string;
  bcsp: string;
  csp: string;
  progress: string;
}

export const looks: Record<LookId, LookTokens> = {
  A: {
    name: "Deep Lab",
    bg: "#070f26",
    bgRaised: "#0b1636",
    card: "#122251",
    card2: "#18295e",
    ink: "#f3f6fb",
    muted: "#b6c0d6",
    line: "#26396e",
    accent: "#7fdca9",
    urgent: "#ff6b6b",
    attention: "#ffb547",
    bcsp: "#c8aeff",
    csp: "#74e3b4",
    progress: "#a7b8ff",
  },
  B: {
    name: "Clinical Glass",
    bg: "#0a1430",
    bgRaised: "#111e44",
    card: "#16244f", // rgba(26, 42, 92, 0.6) over the page, blurred
    card2: "#1d2c5c",
    ink: "#f5f8fd",
    muted: "#bcc6da",
    line: "#3a4c80",
    accent: "#8ff0bd",
    urgent: "#ff6b6b",
    attention: "#ffb547",
    bcsp: "#cdb6ff",
    csp: "#7ee8bc",
    progress: "#a9b9ff",
  },
  C: {
    name: "Night Shift",
    bg: "#04060d",
    bgRaised: "#080c18",
    card: "#0c1222",
    card2: "#131b31",
    ink: "#ffffff",
    muted: "#c3cbdb",
    line: "#161f38",
    accent: "#5ef0a4",
    urgent: "#ff5c5c",
    attention: "#ffb547",
    bcsp: "#c9a8ff",
    csp: "#6ff0bd",
    progress: "#9fb2ff",
  },
};

const KEY = "meridian.look";
/** The approved default look (C · Night Shift). ?look=classic shows the original palette. */
export const DEFAULT_LOOK: LookId | null = "C";

/** Reads ?look=A|B|C|classic (kept for this tab; ?look=default returns to DEFAULT_LOOK) and sets html[data-look]. */
export function applyLookFromUrl() {
  let look: string | null = null;
  try {
    const q = new URLSearchParams(window.location.search).get("look");
    if (q !== null) {
      if (q.toUpperCase() in looks) sessionStorage.setItem(KEY, q.toUpperCase());
      else if (q.toLowerCase() === "classic") sessionStorage.setItem(KEY, "classic");
      else sessionStorage.removeItem(KEY);
    }
    look = sessionStorage.getItem(KEY);
  } catch {
    look = new URLSearchParams(window.location.search).get("look")?.toUpperCase() ?? null;
  }
  if (look === "classic") return void delete document.documentElement.dataset.look;
  look ??= DEFAULT_LOOK;
  if (look && look in looks) document.documentElement.dataset.look = look;
  else delete document.documentElement.dataset.look;
}
