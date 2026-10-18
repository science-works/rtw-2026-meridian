import { animate, motion, useSpring } from "motion/react";
import { useEffect, useId, useState } from "react";
import { useFx } from "../fx";
import { ringStyle as defaultRing, type RingStyle } from "../theme/tokens";
import { Count } from "./Flow";

type Props = { done: number; total: number; label?: string; size?: number; color?: string; ring?: RingStyle };

/** Donut: big percentage in the centre, counts under it (master prompt: "8 of 450 completed · 2%"). */
export function Donut(props: Props) {
  return (props.ring ?? defaultRing) === "3d" ? <LabClock {...props} /> : <FlatDonut {...props} />;
}

function FlatDonut({ done, total, label = "completed", size = 150, color = "var(--accent)" }: Props) {
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

const TILT = 20; // resting tilt, degrees
const HOVER = 6; // parallax range, degrees
const ARC_R = 60;
const ARC_C = 2 * Math.PI * ARC_R;
const TICKS = Array.from({ length: 60 }, (_, i) => i);

/**
 * "Lab clock": a thick bezel ring with depth (stacked layers, perspective tilt, sheen, shadow),
 * a watch face of 60 ticks, a glowing completed arc with a bright head, and a flat centre.
 * Reduced motion / VITE_FX=off: static at the resting tilt, drawn complete, no sweep or hover tilt.
 */
function LabClock({ done, total, label = "completed", size = 150, color = "var(--accent)" }: Props) {
  const fx = useFx();
  const id = useId().replace(/:/g, "");
  const frac = total ? done / total : 0;
  const pct = Math.round(frac * 100);
  const [shown, setShown] = useState(fx.on ? 0 : frac);
  const [pctShown, setPctShown] = useState(fx.on ? 0 : pct);
  const rest = TILT; // the resting tilt is part of the look; only the hover parallax is motion
  const rx = useSpring(rest, { stiffness: 220, damping: 22 });
  const ry = useSpring(0, { stiffness: 220, damping: 22 });

  useEffect(() => rx.jump(rest), [rest, rx]);

  useEffect(() => {
    if (!fx.on) {
      setShown(frac);
      setPctShown(pct);
      return;
    }
    setPctShown(pct); // NumberFlow rolls 0 → pct alongside the sweep
    const a = animate(0, frac, { duration: 0.85, ease: [0.2, 0.8, 0.2, 1], onUpdate: setShown });
    return () => a.stop();
  }, [frac, pct, fx.on]);

  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!fx.on) return;
    const b = e.currentTarget.getBoundingClientRect();
    const dx = (e.clientX - b.left) / b.width - 0.5;
    const dy = (e.clientY - b.top) / b.height - 0.5;
    ry.set(dx * 2 * HOVER);
    rx.set(rest - dy * 2 * HOVER);
  };
  const onLeave = () => {
    rx.set(rest);
    ry.set(0);
  };

  const angle = shown * 2 * Math.PI - Math.PI / 2;
  const head = { x: 100 + ARC_R * Math.cos(angle), y: 100 + ARC_R * Math.sin(angle) };
  const small = size < 120;

  return (
    <figure className={`lab-clock${small ? " small" : ""}`} aria-label={`${done} of ${total} ${label} · ${pct}%`} style={{ ["--d" as string]: `${size}px`, ["--ring" as string]: color }}>
      <div className="lc-stage" onPointerMove={onMove} onPointerLeave={onLeave}>
        <span className="lc-shadow" aria-hidden />
        <motion.div className="lc-tilt" style={{ rotateX: rx, rotateY: ry }} aria-hidden>
          <svg viewBox="0 0 200 200" width="100%" height="100%">
            <defs>
              <linearGradient id={`bezel-${id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#3a5694" />
                <stop offset="0.5" stopColor="#22386b" />
                <stop offset="1" stopColor="#142449" />
              </linearGradient>
              <linearGradient id={`sheen-${id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#ffffff" stopOpacity="0.55" />
                <stop offset="0.28" stopColor="#ffffff" stopOpacity="0.12" />
                <stop offset="0.5" stopColor="#ffffff" stopOpacity="0" />
              </linearGradient>
              <radialGradient id={`face-${id}`} cx="0.5" cy="0.42" r="0.6">
                <stop offset="0" stopColor="#15264f" />
                <stop offset="1" stopColor="#081128" />
              </radialGradient>
              <filter id={`glow-${id}`} x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="3.2" result="b" />
                <feMerge>
                  <feMergeNode in="b" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            {/* Thickness: stacked bezel layers, deepest first */}
            <circle cx="100" cy="106" r="88" fill="none" stroke="#050b1c" strokeWidth="17" />
            <circle cx="100" cy="104" r="88" fill="none" stroke="#0a1531" strokeWidth="17" />
            <circle cx="100" cy="102" r="88" fill="none" stroke="#101f45" strokeWidth="17" />
            <circle cx="100" cy="100" r="88" fill="none" stroke={`url(#bezel-${id})`} strokeWidth="17" />
            <circle cx="100" cy="100" r="88" fill="none" stroke={`url(#sheen-${id})`} strokeWidth="17" />
            {/* Watch face */}
            <circle cx="100" cy="100" r="79.5" fill={`url(#face-${id})`} />
            {TICKS.map((i) => {
              const a = (i / 60) * 2 * Math.PI;
              const long = i % 5 === 0;
              const r1 = 77;
              const r2 = long ? 69 : 73.5;
              return (
                <line
                  key={i}
                  x1={100 + r1 * Math.sin(a)}
                  y1={100 - r1 * Math.cos(a)}
                  x2={100 + r2 * Math.sin(a)}
                  y2={100 - r2 * Math.cos(a)}
                  className={long ? "lc-tick long" : "lc-tick"}
                />
              );
            })}
            {/* Recessed track, then the glowing completed arc and its head */}
            <circle cx="100" cy="100" r={ARC_R} fill="none" stroke="#050b1c" strokeWidth="13" />
            <circle cx="100" cy="101.2" r={ARC_R} fill="none" stroke="#1a2c5c" strokeWidth="2" opacity="0.7" />
            {shown > 0 && (
              <g filter={`url(#glow-${id})`}>
                <circle
                  cx="100"
                  cy="100"
                  r={ARC_R}
                  fill="none"
                  stroke={color}
                  strokeWidth="11"
                  strokeLinecap="round"
                  strokeDasharray={`${Math.max(shown * ARC_C, 0.001)} ${ARC_C}`}
                  transform="rotate(-90 100 100)"
                />
                <circle cx={head.x} cy={head.y} r="7.5" fill={color} />
                <circle cx={head.x} cy={head.y} r="3.6" fill="#ffffff" />
              </g>
            )}
          </svg>
        </motion.div>
        <div className="lc-centre">
          <span className="lc-pct">
            <Count value={pctShown} />%
          </span>
        </div>
      </div>
      <figcaption className="donut-counts">
        <span className="mono">{done}</span> of <span className="mono">{total}</span> {label} · {pct}%
      </figcaption>
    </figure>
  );
}
