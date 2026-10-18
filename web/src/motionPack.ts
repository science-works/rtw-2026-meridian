// Small imperative helpers for Motion Pack effects (each ≤ 900 ms, only for a user action or a recorded event).
import { animate } from "motion/react";

/** The "!" stops with a small settle spring. */
export function settle(el: Element | null) {
  if (!el) return;
  animate(el, { scale: [1, 1.3, 0.92, 1], rotate: [0, -10, 4, 0] }, { duration: 0.45, ease: "easeOut" });
}

/** A ghost of `from` flies into `to` (e.g. the Incidents nav item), shrinking and fading. */
export function flyTo(from: Element | null, to: Element | null, label: string) {
  if (!from || !to) return;
  const a = from.getBoundingClientRect();
  const b = to.getBoundingClientRect();
  const ghost = document.createElement("div");
  ghost.className = "fly-ghost";
  ghost.textContent = label;
  Object.assign(ghost.style, { left: `${a.left}px`, top: `${a.top}px`, width: `${a.width}px`, height: `${a.height}px` });
  document.body.appendChild(ghost);
  const dx = b.left + b.width / 2 - (a.left + a.width / 2);
  const dy = b.top + b.height / 2 - (a.top + a.height / 2);
  const s = Math.max(0.08, Math.min(b.width / a.width, b.height / a.height));
  animate(ghost, { x: [0, dx], y: [0, dy], scale: [1, s], opacity: [0.95, 0.15] }, { duration: 0.7, delay: 0.15, ease: [0.4, 0, 0.2, 1] }).finished.finally(() => ghost.remove());
}
