// Design tokens (docs/DESIGN_RULES.md). Victoria will supply the logo and brand colours:
// change the values here and in :root of styles.css; component code does not change.
export const color = {
  bg: "#0b1530",
  bgRaised: "#0f1b3c",
  card: "#13224a",
  card2: "#1a2c5c",
  ink: "#f3f6fb",
  muted: "#a8b3c9",
  line: "#2a3c6b",
  accent: "#7fdca9", // the one accent
  urgent: "#ff5c5c", // bold red: urgent cases only
  attention: "#ffb547", // warm incident "!" (with a soft glow); no other severity colours
  progress: "#9fb2ff",
  bcsp: "#c8aeff",
  csp: "#74e3b4",
  onLight: "#0b1530",
  simCanvas: "#f6f8fb", // light simulation board
  simInk: "#0b1530",
  simMuted: "#4a5a7a",
  limsBg: "#e9ebee", // deliberately plain "old way" LIMS view
  limsPanel: "#f4f5f7",
  limsInk: "#2b2f36",
  limsMuted: "#4a5059",
  limsLine: "#b9bec6",
} as const;

export const space = [4, 8, 12, 16, 24, 32, 48] as const;
export const radius = { sm: 6, md: 10, lg: 16 } as const;
export const type = { min: 14, base: 16, section: 20, title: 30 } as const;
export const motion = { maxMs: 900, bounceMs: 1400 } as const;

/** CSS variable name for each colour token, e.g. alert → --alert. */
export const cssVar = (k: keyof typeof color) => `--${k.replace(/[A-Z0-9]/g, (m) => `-${m.toLowerCase()}`)}`;
