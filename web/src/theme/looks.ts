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

/**
 * "Stain spectrum": one hue per workflow stage, in lab order, echoing H&E (haematoxylin blue-violet at
 * microtomy, eosin pink at staining). Used only for lines, edges, arcs and dots; never for text or fills.
 */
export const stageColor = {
  reception: "#5EEAD4",
  decal: "#67E8F9",
  processor: "#60A5FA",
  embedding: "#818CF8",
  microtomy: "#A78BFA",
  stain: "#F472B6",
  scan: "#38BDF8",
  iqc: "#A3E635",
  handoff: "#7FDCA9",
} as const;
export type StageKey = keyof typeof stageColor;
export const STAGE_ORDER = Object.keys(stageColor) as StageKey[];

/** Stage of a simulation node or station card id (e.g. "processor-b", "microtomy-queue", "stainer-1"). */
export function stageOfNode(id: string): StageKey {
  if (/^(received|cutup|reception)/.test(id)) return "reception";
  if (id.startsWith("decal")) return "decal";
  if (id.startsWith("processor")) return "processor";
  if (/^embedd/.test(id)) return "embedding";
  if (/^microtom/.test(id)) return "microtomy";
  if (id.startsWith("stainer")) return "stain";
  if (id.startsWith("scanner")) return "scan";
  if (id.startsWith("iqc")) return "iqc";
  return "handoff";
}

/** Stage key for a recorded case stage. */
export const stageOfCase: Record<string, StageKey> = {
  "Received/booked": "reception",
  "Waiting for dissection/cut-up": "reception",
  Decalcification: "decal",
  "Awaiting processor or processing": "processor",
  Embedding: "embedding",
  Microtomy: "microtomy",
  "H&E staining": "stain",
  Scanning: "scan",
  IQC: "iqc",
  "Ready for pathologist handoff": "handoff",
};

/** Colour at position f (0..1) along the spectrum, for gradient arcs. */
export function spectrumAt(f: number): string {
  const stops = STAGE_ORDER.map((k) => stageColor[k]);
  const x = Math.max(0, Math.min(1, f)) * (stops.length - 1);
  const i = Math.min(stops.length - 2, Math.floor(x));
  const t = x - i;
  const a = stops[i], b = stops[i + 1];
  const ch = (h: string, k: number) => parseInt(h.slice(1 + 2 * k, 3 + 2 * k), 16);
  return `#${[0, 1, 2].map((k) => Math.round(ch(a, k) + (ch(b, k) - ch(a, k)) * t).toString(16).padStart(2, "0")).join("")}`;
}

/** True when the "Stain spectrum" preview is on for this tab (?look=spectrum). */
export const spectrumOn = (): boolean => typeof document !== "undefined" && document.documentElement.dataset.spectrum === "on";

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
      else if (["classic", "spectrum"].includes(q.toLowerCase())) sessionStorage.setItem(KEY, q.toLowerCase());
      else sessionStorage.removeItem(KEY);
    }
    look = sessionStorage.getItem(KEY);
  } catch {
    look = new URLSearchParams(window.location.search).get("look")?.toUpperCase() ?? null;
  }
  const root = document.documentElement;
  // "Stain spectrum" (preview): the default look plus stage hues on lines, edges, arcs and dots.
  if (look === "spectrum") {
    root.dataset.spectrum = "on";
    look = null;
  } else delete root.dataset.spectrum;
  if (look === "classic") return void delete root.dataset.look;
  look ??= DEFAULT_LOOK;
  if (look && look in looks) document.documentElement.dataset.look = look;
  else delete document.documentElement.dataset.look;
}
