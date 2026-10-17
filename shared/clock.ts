import type { SimTime } from "./types";

/** The shared simulated clock: Tuesday, Day 1 11:30 (Day 0 = Monday). */
export const CLOCK: SimTime = "Day 1 11:30";

const SIM_TIME = /^Day (-?\d+) (\d{2}):(\d{2})$/;

/** "Day N HH:MM" → minutes since Day 0 00:00 (negative for Day -1). */
export function parseSimTime(s: SimTime): number {
  const m = SIM_TIME.exec(s);
  if (!m) throw new Error(`Not a simulated time: "${s}"`);
  const [day, hh, mm] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (hh > 23 || mm > 59) throw new Error(`Not a simulated time: "${s}"`);
  return day * 1440 + hh * 60 + mm;
}

/** Minutes since Day 0 00:00 → "Day N HH:MM". */
export function formatSimTime(minutes: number): SimTime {
  const day = Math.floor(minutes / 1440);
  const rest = minutes - day * 1440;
  const hh = String(Math.floor(rest / 60)).padStart(2, "0");
  const mm = String(rest % 60).padStart(2, "0");
  return `Day ${day} ${hh}:${mm}`;
}

export const CLOCK_MINUTES = parseSimTime(CLOCK);
