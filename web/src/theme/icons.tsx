// Small inline SVG icons (no emoji; docs/DESIGN_RULES.md rule 16).
const base = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" } as const;

export const SearchIcon = () => (
  <svg {...base} aria-hidden>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </svg>
);
export const TrayIcon = () => (
  <svg {...base} aria-hidden>
    <path d="M3 13h5l2 3h4l2-3h5" />
    <path d="M5 5h14l2 8v6H3v-6z" />
  </svg>
);
export const SendIcon = () => (
  <svg {...base} aria-hidden>
    <path d="M22 2 11 13" />
    <path d="M22 2 15 22l-4-9-9-4z" />
  </svg>
);
export const PlayIcon = () => (
  <svg {...base} aria-hidden>
    <path d="M7 4v16l13-8z" fill="currentColor" />
  </svg>
);
export const PauseIcon = () => (
  <svg {...base} aria-hidden>
    <path d="M7 4h4v16H7zM13 4h4v16h-4z" fill="currentColor" />
  </svg>
);
