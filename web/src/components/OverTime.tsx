// Small "received and cleared over time" line for a section, from recorded events only.
import { formatSimTime } from "../../../shared/clock";
import type { SeriesPoint } from "../../../shared/simulation";

export function OverTime({ series, width = 320, height = 120 }: { series: SeriesPoint[]; width?: number; height?: number }) {
  if (series.length < 2) return null;
  const pad = { l: 8, r: 8, t: 10, b: 8 };
  const max = Math.max(1, ...series.map((p) => p.received));
  const [t0, t1] = [series[0].t, series.at(-1)!.t];
  const x = (t: number) => pad.l + ((t - t0) / (t1 - t0)) * (width - pad.l - pad.r);
  const y = (v: number) => height - pad.b - (v / max) * (height - pad.t - pad.b);
  const path = (k: "received" | "cleared") => series.map((p, i) => `${i ? "L" : "M"}${x(p.t).toFixed(1)},${y(p[k]).toFixed(1)}`).join(" ");
  const last = series.at(-1)!;
  // Midnight markers for the two overnight boundaries.
  const midnights = [0, 1440].filter((m) => m > t0 && m < t1);
  return (
    <figure className="over-time">
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`By ${formatSimTime(last.t)}: ${last.received} received, ${last.cleared} cleared to pathologist handoff`}>
        {midnights.map((m) => (
          <line key={m} x1={x(m)} x2={x(m)} y1={pad.t} y2={height - pad.b} className="ot-midnight" />
        ))}
        <path d={path("received")} className="ot-received" />
        <path d={path("cleared")} className="ot-cleared" />
      </svg>
      <figcaption className="ot-legend">
        <span>
          <i className="ot-key received" aria-hidden /> received <span className="mono">{last.received}</span>
        </span>
        <span>
          <i className="ot-key cleared" aria-hidden /> cleared to handoff <span className="mono">{last.cleared}</span>
        </span>
        <span className="muted">
          <span className="mono">Day -1 06:30</span> → <span className="mono">11:30</span>
        </span>
      </figcaption>
    </figure>
  );
}
