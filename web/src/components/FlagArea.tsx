import { AnimatePresence, motion } from "motion/react";
import type { Alert } from "../../../shared/types";
import { useFx } from "../fx";
import { navigate, paths } from "../router";

/** One-line brief, e.g. "Incident · Microtomy station 4 · levels not recorded (1 of 3)". */
export function briefOf(a: Alert): string {
  const what =
    a.kind === "protocol_mismatch"
      ? `levels not recorded (${/(\d+ of \d+)/.exec(a.what)?.[1] ?? "see incident"})`
      : a.kind === "basket_failure"
        ? "H&E basket failure"
        : a.kind === "outstanding_block"
          ? "block outstanding"
          : "missing scan event";
  return `Incident · ${a.where} · ${what}`;
}

/** Only New incidents: a bouncing warm "!" and a one-line brief. Double-click or Enter opens it. */
export function FlagArea({ alerts }: { alerts: Alert[] }) {
  const fx = useFx();
  const fresh = alerts.filter((a) => a.state === "new");
  return (
    <section className="flag-area" aria-label="New incidents">
      <AnimatePresence initial={false}>
        {fresh.map((a) => (
          <motion.div
            key={a.id}
            className="flag-slot"
            initial={fx.on ? { opacity: 0, y: 12 } : false}
            animate={{ opacity: 1, y: 0 }}
            exit={fx.on ? { opacity: 0, scale: 0.9, y: 16, transition: { duration: 0.35 } } : { opacity: 0, transition: { duration: 0 } }}
            layout
          >
            <div
              className="flag-card"
              role="button"
              tabIndex={0}
              title="Double-click or press Enter to open"
              onDoubleClick={() => navigate(paths.incident(a.id))}
              onKeyDown={(e) => e.key === "Enter" && navigate(paths.incident(a.id))}
            >
              <span className={`flag big ${fx.on ? "bounce" : ""}`} aria-hidden>
                !
              </span>
              <span className="flag-brief">{briefOf(a)}</span>
            </div>
            <p className="flag-hint">Double-click to open</p>
          </motion.div>
        ))}
      </AnimatePresence>
      {fresh.length === 0 && <p className="flag-none">No new incidents</p>}
    </section>
  );
}
