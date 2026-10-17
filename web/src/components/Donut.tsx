/** Completion donut: cases that have left the lab (ready / emitted to the pathologist) vs still in the lab. */
export function Donut({ done, total, size = 168 }: { done: number; total: number; size?: number }) {
  const r = size / 2 - 14;
  const c = 2 * Math.PI * r;
  const frac = total ? done / total : 0;
  const pct = Math.round(frac * 100);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`${done} of ${total} cases have left the lab (${pct}%)`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line)" strokeWidth={16} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="var(--accent)"
        strokeWidth={16}
        strokeLinecap="round"
        strokeDasharray={`${Math.max(frac * c, 0.001)} ${c}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text x="50%" y="46%" textAnchor="middle" className="donut-big">
        {done} of {total}
      </text>
      <text x="50%" y="62%" textAnchor="middle" className="donut-small">
        {pct}%
      </text>
    </svg>
  );
}
