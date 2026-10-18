// Parses pitch/SCRIPT.md into presenter cards. One card per speaker beat or stage action;
// the text is kept verbatim (never paraphrased).
export interface ScriptCard {
  /** e.g. "3 · THE REINVENTION" */
  section: string;
  /** e.g. "0:45–2:45", when the section heading gives one */
  window?: string;
  speaker?: string;
  /** Stage direction in brackets, e.g. "Simulation → Play" */
  cue?: string;
  /** Spoken lines, verbatim. Lines starting with ✂️ are the first to cut. */
  lines: string[];
  /** A card Meridian adds for a demo screen; it is not in SCRIPT.md and has no spoken lines. */
  extra?: boolean;
}

export interface Script {
  title: string;
  notes: string[];
  cards: ScriptCard[];
  /** "Never say: …" footer lines */
  never: string[];
}

const SPEAKERS = /^(Victoria|Manthan)\b\s*/;
const HEADING = /^(\d+\s*·\s*[^(]+?|CLOSE)\s*\(([^)]+)\)\s*(?:·\s*(Victoria|Manthan))?\s*(?:\[([^\]]+)\])?\s*$/;

export function parseScript(md: string): Script {
  const out: Script = { title: "", notes: [], cards: [], never: [] };
  let section = "";
  let window: string | undefined;
  let speaker: string | undefined;
  let card: ScriptCard | null = null;
  const push = (c: ScriptCard) => {
    out.cards.push(c);
    card = c;
  };
  for (const raw of md.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith("# ")) {
      out.title = line.slice(2).trim();
      continue;
    }
    if (/^Never say:/i.test(line)) {
      out.never.push(line);
      continue;
    }
    const h = HEADING.exec(line);
    if (h) {
      section = h[1].trim();
      window = h[2].trim();
      speaker = h[3];
      card = null;
      if (speaker) push({ section, window, speaker, cue: h[4]?.trim(), lines: [] });
      continue;
    }
    const sp = SPEAKERS.exec(line);
    if (sp) {
      speaker = sp[1];
      const rest = line.slice(sp[0].length).trim();
      const cue = /^\[([^\]]+)\]\s*/.exec(rest);
      const text = cue ? rest.slice(cue[0].length).trim() : rest;
      push({ section, window, speaker, cue: cue?.[1].trim(), lines: text ? [text] : [] });
      continue;
    }
    const cueOnly = /^\[([^\]]+)\]$/.exec(line);
    if (cueOnly) {
      push({ section, window, speaker, cue: cueOnly[1].trim(), lines: [] });
      continue;
    }
    if (!section) {
      out.notes.push(line);
      continue;
    }
    if (card) (card as ScriptCard).lines.push(line);
    else push({ section, window, speaker, lines: [line] });
  }
  return out;
}

/** "2:45" → 165 seconds */
export const mmss = (s: string) => {
  const [m, sec] = s.split(":").map(Number);
  return m * 60 + sec;
};

const SCREENS: Record<string, string> = { dashboard: "/", "lims view": "/lims-view", simulation: "/simulation", incidents: "/incidents", compare: "/compare" };

/** The side-by-side card, shown between "the old way" and "the reinvention". */
export const COMPARE_CARD: ScriptCard = {
  section: "Between 2 and 3 · SIDE BY SIDE",
  cue: "Compare: 26H1004, a LIMS today on the left, Meridian on the right",
  lines: [],
  extra: true,
};

/** Cards as presented: the script's cards, plus the compare card after the last "2 ·" card. */
export function presentedCards(cards: ScriptCard[]): ScriptCard[] {
  const i = cards.reduce((last, c, k) => (c.section.startsWith("2 ·") ? k : last), -1);
  return i < 0 ? [...cards, COMPARE_CARD] : [...cards.slice(0, i + 1), COMPARE_CARD, ...cards.slice(i + 1)];
}

/**
 * The screen a beat starts on, when its cue names one ("[Simulation → Play]" → /simulation).
 * Beats whose cue is a live action ("types 26H2345", "double-clicks the flag") return null:
 * the presenter does those by hand, so Story mode never fakes them.
 */
export function routeForCue(cue: string | undefined): string | null {
  if (!cue) return null;
  const head = cue.split(/[:→,]/)[0].trim().toLowerCase();
  return SCREENS[head] ?? null;
}
