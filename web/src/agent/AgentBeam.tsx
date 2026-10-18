import { motion } from "motion/react";
import { useLayoutEffect, useState } from "react";

interface Props {
  /** Case IDs the agent just read; the beam points at the first one visible on screen. */
  caseIds: string[];
  onDone: () => void;
}

const visible = (el: Element | null | undefined): el is Element => {
  if (!el) return false;
  const r = el.getBoundingClientRect();
  return r.height > 0 && r.bottom > 0 && r.top < window.innerHeight && r.right > 0 && r.left < window.innerWidth;
};

/** The first on-screen element showing one of these cases: a case row, the case page title, a chip. */
function targetFor(caseIds: string[]): Element | null {
  for (const id of caseIds) {
    const candidates = [
      ...document.querySelectorAll(`[data-case="${id}"]`),
      ...[...document.querySelectorAll(".case-page h1, .chip, .compare-meridian h2 a")].filter((c) => c.textContent?.trim() === id),
    ];
    const hit = candidates.find(visible);
    if (hit) return hit.closest(".case-row, .urgent-row, .flag-card") ?? hit;
  }
  return null;
}

/** A one-way beam from the agent badge INTO the dashboard: the agent only reads. ≤ 900 ms. */
export function AgentBeam({ caseIds, onDone }: Props) {
  const [path, setPath] = useState<{ d: string; x: number; y: number } | null>(null);

  useLayoutEffect(() => {
    const from = document.querySelector(".agent-badge")?.getBoundingClientRect();
    const target = targetFor(caseIds);
    const to = target?.getBoundingClientRect();
    if (!from || !to || !target) return onDone(); // skip when the case is not on screen
    target.classList.add("agent-read");
    setTimeout(() => target.classList.remove("agent-read"), 1500);
    const x1 = from.right - 10;
    const y1 = from.top - 2;
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
