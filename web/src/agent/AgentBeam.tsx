import { motion } from "motion/react";
import { useLayoutEffect, useState } from "react";

interface Props {
  /** Case IDs the agent just read; the beam points at the first one visible on screen. */
  caseIds: string[];
  onDone: () => void;
}

function targetFor(caseIds: string[]): Element | null {
  for (const id of caseIds) {
    const row = document.querySelector(`tr[data-case="${id}"]`);
    if (row && row.getBoundingClientRect().height > 0) return row;
    const chip = [...document.querySelectorAll(".queue .alert-card .chip")].find((c) => c.textContent === id);
    if (chip) return chip.closest(".alert-card");
  }
  return null;
}

/** A one-way beam from the agent badge INTO the dashboard: the agent only reads. ≤ 900 ms. */
export function AgentBeam({ caseIds, onDone }: Props) {
  const [path, setPath] = useState<{ d: string; x: number; y: number } | null>(null);

  useLayoutEffect(() => {
    const from = document.querySelector(".agent-badge")?.getBoundingClientRect();
    const to = targetFor(caseIds)?.getBoundingClientRect();
    if (!from || !to) return onDone();
    const x1 = from.left + 12;
    const y1 = from.top + from.height / 2;
    const x2 = to.right - 8;
    const y2 = to.top + to.height / 2;
    const cx = (x1 + x2) / 2;
    setPath({ d: `M ${x1} ${y1} C ${cx} ${y1}, ${cx} ${y2}, ${x2} ${y2}`, x: x2, y: y2 });
    const t = setTimeout(onDone, 900);
    return () => clearTimeout(t);
  }, [caseIds, onDone]);

  if (!path) return null;
  return (
    <svg className="agent-beam" aria-hidden>
      <defs>
        <marker id="beam-head" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--progress)" />
        </marker>
      </defs>
      <motion.path
        d={path.d}
        fill="none"
        stroke="var(--progress)"
        strokeWidth={3}
        strokeLinecap="round"
        markerEnd="url(#beam-head)"
        initial={{ pathLength: 0, opacity: 0.95 }}
        animate={{ pathLength: 1, opacity: [0.95, 0.95, 0] }}
        transition={{ pathLength: { duration: 0.55, ease: "easeOut" }, opacity: { duration: 0.85, times: [0, 0.7, 1] } }}
      />
    </svg>
  );
}
