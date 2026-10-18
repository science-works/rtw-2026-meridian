// Viz 2 · How it works: the layered architecture, left to right, with the guardrails beside it.
// Arrows are measured from the boxes on screen; small packets travel them on a slow cycle
// (static under reduced motion). The test count comes from web/src/generated/test-count.json.
import { useLayoutEffect, useRef, useState } from "react";
import testCount from "../generated/test-count.json";
import { useFx } from "../fx";

const NODES = [
  { id: "lab", col: "1", row: "1 / 3", title: "Lab systems", lines: ["LIMS export", "Equipment events"] },
  { id: "model", col: "2", row: "1 / 3", title: "Open event model", lines: ["case · block · slide · event"] },
  { id: "rules", col: "3", row: "1 / 3", title: "Rules engine", lines: ["Alerts and estimates", "Deterministic, tested"] },
  { id: "state", col: "4", row: "1 / 3", title: "Live state", lines: ["One source of truth", "11:30, pushed live"] },
  { id: "screens", col: "5 / 7", row: "1", title: "Screens", lines: ["Dashboard · Simulation", "Incidents · Case pages"] },
  { id: "mcp", col: "5", row: "2", title: "MCP endpoint", lines: ["get_case · list_alerts", "cases_delayed"] },
  { id: "agents", col: "6", row: "2", title: "AI agents", lines: ["Read-only"] },
] as const;
const EDGES: [string, string][] = [
  ["lab", "model"],
  ["model", "rules"],
  ["rules", "state"],
  ["state", "screens"],
  ["state", "mcp"],
  ["mcp", "agents"],
];

export function HowItWorks() {
  const fx = useFx();
  const box = useRef<HTMLDivElement>(null);
  const [paths, setPaths] = useState<{ id: string; d: string }[]>([]);

  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const measure = () => {
      const base = el.getBoundingClientRect();
      const r = (id: string) => el.querySelector(`[data-node="${id}"]`)!.getBoundingClientRect();
      setPaths(
        EDGES.map(([a, b]) => {
          const p = r(a), q = r(b);
          const x1 = p.right - base.left, y1 = p.top + p.height / 2 - base.top;
          const x2 = q.left - base.left, y2 = q.top + q.height / 2 - base.top;
          const mx = (x1 + x2) / 2;
          return { id: `${a}-${b}`, d: `M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2 - 6},${y2}` };
        }),
      );
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <section className="page how">
      <header className="page-head">
        <div>
          <p className="page-kicker">How it works</p>
          <h1>Rules decide, AI explains, scientists act</h1>
          <p className="page-sub">Meridian sits beside a lab&apos;s LIMS. Events come in through an open model; deterministic rules compute every number; screens and AI agents read the same live state.</p>
        </div>
      </header>
      <div className="how-grid">
        <div className="how-diagram" ref={box}>
          <svg className="how-arrows" aria-hidden>
            <defs>
              <marker id="how-head" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="8" markerHeight="8" orient="auto">
                <path d="M0 0 L10 5 L0 10 z" fill="var(--accent)" />
              </marker>
            </defs>
            {paths.map((p, i) => (
              <g key={p.id}>
                <path id={`how-${p.id}`} d={p.d} className="how-arrow" markerEnd="url(#how-head)" />
                {fx.on && (
                  <circle r="4" className="how-packet">
                    <animateMotion dur="4.8s" begin={`${i * 0.6}s`} repeatCount="indefinite" path={p.d} />
                  </circle>
                )}
              </g>
            ))}
          </svg>
          {NODES.map((n) => (
            <div key={n.id} className={`how-node how-${n.id}`} data-node={n.id} style={{ gridColumn: n.col, gridRow: n.row }}>
              <p className="how-title">{n.title}</p>
              {n.lines.map((l) => (
                <p key={l} className="how-line">
                  {l}
                </p>
              ))}
            </div>
          ))}
        </div>
        <aside className="how-guard" aria-label="Guardrails">
          <p className="how-guard-title">Guardrails</p>
          {["AI read-only (tested)", "Unknown, never guessed", "No diagnosis", "Runs on the lab's network", `${testCount.passed} tests`].map((g) => (
            <span key={g} className="how-badge">
              {g}
            </span>
          ))}
        </aside>
      </div>
      <p className="muted how-note">Simulated data in this demo. A live version would connect through the interfaces available at each lab.</p>
    </section>
  );
}
