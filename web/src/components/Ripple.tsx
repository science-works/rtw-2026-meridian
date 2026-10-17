import { motion } from "motion/react";
import { useLayoutEffect, useState } from "react";

interface Props {
  /** CSS selector of the element the ripple starts from (the failed station's lane). */
  from: string;
  /** Text shown at the origin, taken from the alert (e.g. "20 slides · 10 cases"). */
  label: string;
  onDone: () => void;
}

const RINGS = [0, 0.12, 0.24];

/** One crimson ripple spreading from the failed station. ≤ 900 ms, then it removes itself. */
export function Ripple({ from, label, onDone }: Props) {
  const [origin, setOrigin] = useState<{ x: number; y: number } | null>(null);

  useLayoutEffect(() => {
    const r = document.querySelector(from)?.getBoundingClientRect();
    if (!r) return onDone();
    setOrigin({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
    const t = setTimeout(onDone, 900);
    return () => clearTimeout(t);
  }, [from, onDone]);

  if (!origin) return null;
  return (
    <div className="ripple-layer" aria-hidden>
      {RINGS.map((delay) => (
        <motion.span
          key={delay}
          className="ripple-ring"
          style={{ left: origin.x, top: origin.y }}
          initial={{ scale: 0.05, opacity: 0.7 }}
          animate={{ scale: 1, opacity: 0 }}
          transition={{ duration: 0.65, delay, ease: "easeOut" }}
        />
      ))}
      <span className="ripple-anchor" style={{ left: origin.x, top: origin.y }}>
        <motion.span
          className="ripple-label"
          initial={{ opacity: 0, y: 0, scale: 0.9 }}
          animate={{ opacity: [0, 1, 1, 0], y: -28, scale: 1 }}
          transition={{ duration: 0.88, times: [0, 0.15, 0.75, 1] }}
        >
          {label}
        </motion.span>
      </span>
    </div>
  );
}
