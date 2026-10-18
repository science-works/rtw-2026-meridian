// Top-left corner instrument: "Lab pulse", recorded events per hour today (Day 1 00:00 to the clock).
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import type { SimulationResponse } from "../../../shared/types";
import { CLOCK_MINUTES } from "../../../shared/clock";
import { Corner } from "./Corner";
import type { CornerProps } from "./types";

const DAY1_START = 1440;

/** Hourly event counts from dayStart up to clock; the last bucket is partial when clock is mid-hour. */
export function eventsPerHour(events: { t: number }[], dayStart: number, clock: number): number[] {
  const n = Math.max(0, Math.ceil((clock - dayStart) / 60));
  const buckets = new Array<number>(n).fill(0);
  for (const e of events) {
    if (e.t < dayStart || e.t > clock) continue;
    const i = Math.min(n - 1, Math.floor((e.t - dayStart) / 60));
    if (i >= 0) buckets[i]++;
  }
  return buckets;
}

function Microscope({ motion: animate }: { motion: boolean }) {
  return (
    <svg viewBox="0 0 56 56" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {/* base */}
      <path d="M12 50h32" />
      <path d="M18 50v-3h20v3" />
      {/* arm */}
      <path d="M36 47c6-6 6-16 0-22" />
      <path d="M36 25l-4-4" />
      {/* stage */}
      <path d="M16 36h18" />
      <path d="M30 36v6" />
      {/* tube and objective */}
      <path d="M22 10l10 10" />
      <path d="M19 13l10 10" />
      <path d="M27 23l-3 7" />
      <path d="M23 31h3" />
      {/* eyepiece */}
      <path d="M18 7l6 6" />
      <path d="M17 8l-1.5 1.5 6 6 1.5-1.5" />
      {/* lens ring */}
      {animate ? (
        <motion.circle
          cx={24.5}
          cy={33.5}
          r={2.2}
          style={{ transformOrigin: "24.5px 33.5px", transformBox: "view-box" }}
          initial={{ scale: 1.25, opacity: 0.2 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      ) : (
        <circle cx={24.5} cy={33.5} r={2.2} />
      )}
    </svg>
  );
}

function Sparkline({ values }: { values: number[] }) {
  // Sized to sit beside the value inside the ~158px body column, keeping the card under 90px tall.
  const W = 52;
  const H = 22;
  const pad = 3;
  const max = Math.max(1, ...values);
  const step = values.length > 1 ? (W - pad * 2) / (values.length - 1) : 0;
  const pts = values.map((v, i) => [pad + i * step, H - pad - (v / max) * (H - pad * 2)] as const);
  const line = pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const last = pts[pts.length - 1];
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden="true" style={{ display: "block", flex: "none" }}>
      {pts.length > 1 && (
        <>
          <polygon points={`${pad},${H - pad} ${line} ${last[0].toFixed(1)},${H - pad}`} fill="var(--accent)" opacity={0.12} />
          <polyline points={line} fill="none" stroke="var(--accent)" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
        </>
      )}
      {last && <circle cx={last[0]} cy={last[1]} r={2.6} fill="var(--accent)" />}
    </svg>
  );
}

export function TopLeft(props: CornerProps) {
  const [hours, setHours] = useState<number[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let live = true;
    fetch("/api/simulation")
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json() as Promise<SimulationResponse>;
      })
      .then((sim) => live && setHours(eventsPerHour(sim.events, DAY1_START, CLOCK_MINUTES)))
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, []);

  const total = hours ? hours.reduce((a, b) => a + b, 0) : null;

  return (
    <Corner
      to="/simulation"
      title="Lab pulse"
      testId="corner-top-left"
      label="Lab pulse: recorded events per hour today. Opens the simulation."
      art={<Microscope motion={props.motion} />}
    >
      <span style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
        <span className="corner-value corner-mono" style={{ whiteSpace: "nowrap" }}>{failed || total === null ? "—" : `${total} events`}</span>
        {hours && !failed && <Sparkline values={hours} />}
      </span>
      <span className="corner-sub">today, per hour</span>
    </Corner>
  );
}
