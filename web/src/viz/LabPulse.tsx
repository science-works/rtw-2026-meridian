// Viz 4 · Lab pulse: recorded events per stage per hour, Day -1 06:00 → Day 1 11:30. One sequential
// scale (navy → accent), the maximum labelled; a marker follows the playback clock; small warm ticks
// mark the hours of the recorded incidents on their own rows.
import { useMemo, useState } from "react";
import { formatSimTime, parseSimTime } from "../../../shared/clock";
import { nodeForStation, type NodeId } from "../../../shared/simulation";
import { stageOfNode, type StageKey } from "../theme/looks";

const ROWS: { key: StageKey; label: string }[] = [
  { key: "reception", label: "Reception / cut-up" },
  { key: "decal", label: "Decalcification" },
  { key: "processor", label: "Processors" },
  { key: "embedding", label: "Embedding" },
  { key: "microtomy", label: "Microtomy" },
  { key: "stain", label: "H&E staining" },
  { key: "scan", label: "Scanning" },
  { key: "iqc", label: "IQC" },
  { key: "handoff", label: "Handoff" },
];
const START = parseSimTime("Day -1 06:00");

interface Props {
  events: { t: number; caseId: string; station: string | null; type: string }[];
  now: number;
  end: number;
  incidents: { t: number; node: NodeId }[];
}

export function LabPulse({ events, now, end, incidents }: Props) {
  const hours = Math.ceil((end - START) / 60);
  const { grid, max } = useMemo(() => {
    const grid = ROWS.map(() => Array.from({ length: hours }, () => ({ n: 0, cases: new Map<string, number>() })));
    for (const e of events) {
      const node = nodeForStation(e.station, null);
      if (!node || e.t < START || e.t > end) continue;
      const r = ROWS.findIndex((x) => x.key === stageOfNode(node));
      const c = Math.min(hours - 1, Math.floor((e.t - START) / 60));
      const cell = grid[r][c];
      cell.n++;
      cell.cases.set(e.caseId, (cell.cases.get(e.caseId) ?? 0) + 1);
    }
    return { grid, max: Math.max(1, ...grid.flat().map((x) => x.n)) };
  }, [events, hours, end]);
  const [hover, setHover] = useState<{ r: number; c: number } | null>(null);
  const marker = Math.max(0, Math.min(1, (now - START) / (hours * 60)));
  const ticks = incidents.map((i) => ({ r: ROWS.findIndex((x) => x.key === stageOfNode(i.node)), c: Math.floor((i.t - START) / 60), t: i.t }));
  const hourLabel = (c: number) => formatSimTime(START + c * 60);
  const info = hover
    ? (() => {
        const cell = grid[hover.r][hover.c];
        const top = [...cell.cases].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([id]) => id);
        return `${ROWS[hover.r].label} · ${hourLabel(hover.c)}–${hourLabel(hover.c + 1).slice(-5)} · ${cell.n} event${cell.n === 1 ? "" : "s"}${top.length ? ` · ${top.join(", ")}` : ""}`;
      })()
    : "Hover a tile for the hour's events and its busiest cases.";

  return (
    <section className="lab-pulse" aria-label="Lab pulse: recorded events per stage per hour">
      <header className="lp-head">
        <h2>Lab pulse</h2>
        <p className="lp-info" aria-live="polite">
          {info}
        </p>
        <span className="lp-legend">
          0 <i className="lp-scale" aria-hidden /> <span className="mono">{max}</span> events / hour (square-root scale)
        </span>
      </header>
      <div className="lp-body">
        <ol className="lp-labels">
          {ROWS.map((r) => (
            <li key={r.key} data-stage={r.key}>
              {r.label}
            </li>
          ))}
        </ol>
        <div className="lp-grid" style={{ gridTemplateColumns: `repeat(${hours}, minmax(0, 1fr))` }} onMouseLeave={() => setHover(null)}>
          {grid.map((row, r) =>
            row.map((cell, c) => (
              <span
                key={`${r}-${c}`}
                className={`lp-tile${hover?.r === r && hover?.c === c ? " on" : ""}`}
                style={{ gridRow: r + 1, gridColumn: c + 1, ["--v" as string]: `${cell.n ? Math.round(12 + 88 * Math.sqrt(cell.n / max)) : 0}%` }}
                onMouseEnter={() => setHover({ r, c })}
              />
            )),
          )}
          {ticks.map((k) =>
            k.r >= 0 && k.c >= 0 && k.c < hours ? (
              <span key={`${k.r}-${k.t}`} className="lp-tick" style={{ gridRow: k.r + 1, gridColumn: k.c + 1 }} title={`Incident recorded ${formatSimTime(k.t).slice(-5)}`} />
            ) : null,
          )}
          <span className="lp-marker" style={{ left: `${marker * 100}%` }} aria-hidden />
        </div>
      </div>
      <p className="lp-axis mono">
        {["Day -1 06:00", "Day 0 06:00", "Day 1 06:00"].map((l) => (
          <span key={l} style={{ left: `${((parseSimTime(l) - START) / (hours * 60)) * 100}%` }}>
            {l}
          </span>
        ))}
      </p>
    </section>
  );
}
