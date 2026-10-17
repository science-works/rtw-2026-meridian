import { motion } from "motion/react";
import type { Alert } from "../../../shared/types";
import { useFx } from "../fx";
import { navigate, paths } from "../router";
import { dockItems } from "./dockItems";

/** Incident dock (Victoria's design): one red "!" per open incident; a new one bounces until acknowledged. */
export function Dock({ alerts }: { alerts: Alert[] }) {
  const fx = useFx();
  const items = dockItems(alerts, fx.on);
  return (
    <nav className="dock" aria-label="Open incidents">
      <span className="dock-label">Open incidents</span>
      {items.length === 0 && <span className="dock-empty">None open</span>}
      {items.map((it) => (
        <motion.button
          key={it.id}
          className={`dock-item ${it.bounce ? "bounce" : ""}`}
          title={it.label}
          aria-label={it.label}
          onClick={() => navigate(paths.incident(it.id))}
          initial={fx.on ? { scale: 0.4, opacity: 0 } : false}
          animate={{ scale: 1, opacity: 1 }}
          whileHover={fx.on ? { scale: 1.25, y: -6 } : undefined}
          transition={{ type: "spring", stiffness: 400, damping: 22 }}
        >
          !
        </motion.button>
      ))}
      <button className="dock-link" onClick={() => navigate(paths.incidents)}>
        All incidents
      </button>
    </nav>
  );
}
