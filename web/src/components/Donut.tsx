/** Donut: big percentage in the centre, counts under it (master prompt: "8 of 450 completed · 2%"). */
export function Donut({ done, total, label = "completed", size = 150, color = "var(--accent)" }: { done: number; total: number; label?: string; size?: number; color?: string }) {
  const r = size / 2 - 12;
  const c = 2 * Math.PI * r;
  const frac = total ? done / total : 0;
  const pct = Math.round(frac * 100);
  return (
    <figure className="donut" aria-label={`${done} of ${total} ${label} · ${pct}%`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line)" strokeWidth={14} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={14}
          strokeLinecap="round"
          className="donut-arc"
          style={{ ["--c" as string]: `${c}` }}
          strokeDasharray={`${Math.max(frac * c, 0.001)} ${c}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
        <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle" className="donut-pct">
          {pct}%
        </text>
      </svg>
      <figcaption className="donut-counts">
        <span className="mono">{done}</span> of <span className="mono">{total}</span> {label} · {pct}%
      </figcaption>
    </figure>
  );
}
