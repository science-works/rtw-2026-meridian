// Viz 5 · Incident blast radius: basket → its slides (grouped by case) → cases → each case's handoff
// time. Branch width = slide count. Every number comes from the alert and the case summaries.
import type { Alert, CaseSummary } from "../../../shared/types";
import { etaText } from "../caseLine";
import { navigate, paths } from "../router";

export function BlastRadius({ alert, cases }: { alert: Alert; cases: CaseSummary[] }) {
  const slides = alert.slideIds ?? [];
  const perCase = alert.caseIds.map((id) => ({ id, n: slides.filter((s) => s.startsWith(`${id}-`)).length, c: cases.find((x) => x.caseId === id) }));
  const basket = alert.where.split(" · ").at(-1) ?? "Basket";
  const W = 1000, rowH = 34, H = Math.max(240, perCase.length * rowH + 20);
  const src = { x: 150, y: H / 2 };
  const unit = 3.2; // px per slide
  let acc = src.y - (slides.length * unit) / 2;
  return (
    <section className="panel blast" aria-label={`${basket}: ${slides.length} slides across ${alert.caseIds.length} cases`}>
      <h2>
        Blast radius · {basket} → <span className="mono">{slides.length}</span> slides → <span className="mono">{alert.caseIds.length}</span> cases
      </h2>
      <svg viewBox={`0 0 ${W} ${H}`} className="blast-svg" role="img">
        <title>{`${basket}: ${slides.length} slides across ${alert.caseIds.length} cases`}</title>
        {perCase.map((p, i) => {
          const y0 = acc + (p.n * unit) / 2;
          acc += p.n * unit;
          const y1 = 10 + i * rowH + rowH / 2;
          const w = Math.max(2, p.n * unit);
          return (
            <path
              key={p.id}
              className="blast-branch"
              style={{ animationDelay: `${i * 40}ms` }}
              d={`M${src.x},${y0} C${src.x + 220},${y0} ${560 - 220},${y1} 560,${y1}`}
              strokeWidth={w}
              pathLength={1}
            />
          );
        })}
        <rect x={10} y={src.y - 34} width={140} height={68} rx={10} className="blast-src" />
        <text x={80} y={src.y - 8} textAnchor="middle" className="blast-src-t">
          {basket}
        </text>
        <text x={80} y={src.y + 16} textAnchor="middle" className="blast-src-n">
          {slides.length} slides
        </text>
        {perCase.map((p, i) => {
          const y = 10 + i * rowH + rowH / 2;
          const eta = p.c ? etaText(p.c) : null;
          return (
            <g key={p.id} className="blast-case" role="link" tabIndex={0} onClick={() => navigate(paths.case(p.id))} onKeyDown={(e) => e.key === "Enter" && navigate(paths.case(p.id))}>
              <rect x={566} y={y - 14} width={250} height={28} rx={8} />
              <text x={580} y={y + 5} className="blast-id">
                {p.id}
              </text>
              <text x={690} y={y + 5} className="blast-n">
                {p.n} slide{p.n === 1 ? "" : "s"}
              </text>
              <text x={830} y={y + 5} className={`blast-eta ${eta?.tone ?? ""}`}>
                {eta?.text ?? "ETA unknown"}
              </text>
            </g>
          );
        })}
      </svg>
      <p className="muted blast-note">Branch width = slides from that case in the failed basket. Click a case to open it.</p>
    </section>
  );
}
