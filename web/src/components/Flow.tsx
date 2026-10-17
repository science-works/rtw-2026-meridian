// Numbers that roll to their new value (NumberFlow) when effects are on, plain text otherwise.
import NumberFlow from "@number-flow/react";
import { useFx } from "../fx";

const TIMING = { duration: 700, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" } as const; // ≤ 900 ms

export function Count({ value, className }: { value: number; className?: string }) {
  const fx = useFx();
  if (!fx.on) return <span className={className} data-value={value}>{value}</span>;
  return (
    <span className={className} data-value={value}>
      <NumberFlow value={value} spinTiming={TIMING} transformTiming={TIMING} opacityTiming={{ duration: 350, easing: "ease-out" }} />
    </span>
  );
}

/** A simulated clock time ("Day 1 12:55") whose hours and minutes roll when it changes. */
export function TimeFlow({ value, className }: { value: string; className?: string }) {
  const fx = useFx();
  const m = /^Day (-?\d+) (\d\d):(\d\d)$/.exec(value);
  if (!fx.on || !m) return <span className={className} data-value={value}>{value}</span>;
  const two = { minimumIntegerDigits: 2, useGrouping: false } as const;
  return (
    <span className={className} aria-label={value} data-value={value}>
      Day <NumberFlow value={Number(m[1])} spinTiming={TIMING} transformTiming={TIMING} /> <NumberFlow value={Number(m[2])} format={two} spinTiming={TIMING} transformTiming={TIMING} />:
      <NumberFlow value={Number(m[3])} format={two} spinTiming={TIMING} transformTiming={TIMING} />
    </span>
  );
}
