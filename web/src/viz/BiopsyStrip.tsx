// Viz 1 · "Life of a biopsy": ten steps from tissue to pathologist as simple line icons on one
// flowing line (an illustration, not a picture of real tissue). The line draws through once on load.
import type { ReactNode } from "react";

const S = { fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round", strokeLinejoin: "round" } as const;

/** 24 × 24 line icons, drawn for Meridian. */
const ICONS: { label: string; icon: ReactNode }[] = [
  {
    label: "Tissue sample",
    icon: (
      <>
        <path {...S} d="M7 9h10l-1 11H8L7 9z" />
        <path {...S} d="M6 9h12" />
        <path {...S} d="M10 14c0-1.5 1.2-2.2 2.3-1.8 1.4.5 2.2 1.6 1.4 2.8-.8 1.1-3.7 1.2-3.7-1z" />
      </>
    ),
  },
  {
    label: "Cassette",
    icon: (
      <>
        <rect {...S} x="5" y="6" width="14" height="12" rx="1.5" />
        <path {...S} d="M8 9.5h8M8 12h8M8 14.5h8" />
        <path {...S} d="M19 9l2 1v4l-2 1" />
      </>
    ),
  },
  {
    label: "Processor",
    icon: (
      <>
        <rect {...S} x="4" y="5" width="16" height="14" rx="2" />
        <circle {...S} cx="12" cy="12" r="3.5" />
        <path {...S} d="M12 12l2-1.5" />
        <path {...S} d="M7 8h2" />
      </>
    ),
  },
  {
    label: "Wax block",
    icon: (
      <>
        <path {...S} d="M5 9l3-3h8l3 3v9H5V9z" />
        <path {...S} d="M5 9h14" />
        <path {...S} d="M10 13c.6-1.2 2.6-1.3 3.4-.3.8 1-.2 2.5-1.7 2.4-1.3-.1-2.2-1-1.7-2.1z" />
      </>
    ),
  },
  {
    label: "Microtome",
    icon: (
      <>
        <path {...S} d="M4 8h9l-2 3H4z" />
        <path {...S} d="M11 11c2 0 2 2 4 2s2-2 4-2 2 2 3 2" />
        <path {...S} d="M11 15c2 0 2 2 4 2s2-2 4-2" />
      </>
    ),
  },
  {
    label: "Glass slide",
    icon: (
      <>
        <rect {...S} x="3" y="8" width="18" height="8" rx="1" />
        <path {...S} d="M3 8h5v8H3" />
        <path {...S} d="M12 12c.4-1 2-1.3 2.8-.5.8.8.1 2-1.2 2-1.1 0-1.9-.6-1.6-1.5z" />
      </>
    ),
  },
  {
    label: "H&E stain",
    icon: (
      <>
        <path {...S} d="M8 4v4l-3 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-3-9V4" />
        <path {...S} d="M7 4h10" />
        <path {...S} d="M6.5 14h11" />
      </>
    ),
  },
  {
    label: "Scanner",
    icon: (
      <>
        <rect {...S} x="4" y="7" width="16" height="10" rx="2" />
        <path {...S} d="M4 12h16" strokeDasharray="2 2" />
        <path {...S} d="M8 17v2h8v-2" />
      </>
    ),
  },
  {
    label: "IQC check",
    icon: (
      <>
        <circle {...S} cx="10.5" cy="10.5" r="5.5" />
        <path {...S} d="M14.5 14.5L20 20" />
        <path {...S} d="M8 10.5l1.8 1.8L13 9" />
      </>
    ),
  },
  {
    label: "Pathologist",
    icon: (
      <>
        <path {...S} d="M9 4l4 6" />
        <path {...S} d="M8 5l2-1.5" />
        <path {...S} d="M13 10l-3 2" />
        <path {...S} d="M12 13a4 4 0 0 1 4 4" />
        <path {...S} d="M6 20h12M8 20v-2h8" />
      </>
    ),
  },
];

export function BiopsyStrip({ tone = "dark" }: { tone?: "dark" | "lims" }) {
  const n = ICONS.length;
  // One gentle wave through the column centres (in a 1000 × 80 box).
  const xs = ICONS.map((_, i) => ((i + 0.5) / n) * 1000);
  const d = xs.map((x, i) => (i === 0 ? `M${x},40` : `S${x - 50},${i % 2 ? 22 : 58} ${x},40`)).join(" ");
  return (
    <figure className={`biopsy-strip ${tone}`} aria-label="Life of a biopsy: about ten steps from tissue sample to pathologist (illustration)">
      <div className="bs-track">
        <svg className="bs-line" viewBox="0 0 1000 80" preserveAspectRatio="none" aria-hidden>
          <path d={d} />
        </svg>
        <ol className="bs-steps" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}>
          {ICONS.map((s, i) => (
            <li key={s.label} style={{ ["--i" as string]: i, ["--n" as string]: n }}>
              <span className="bs-icon">
                <svg viewBox="0 0 24 24" width="34" height="34" aria-hidden>
                  {s.icon}
                </svg>
              </span>
              <span className="bs-label">{s.label}</span>
            </li>
          ))}
        </ol>
      </div>
      <figcaption className="bs-caption">Life of a biopsy · illustration</figcaption>
    </figure>
  );
}
