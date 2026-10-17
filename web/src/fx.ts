// Effects switch. VITE_FX=off (or the viewer's reduced-motion setting, or the
// in-app "skip animations" toggle) turns every effect off; the dashboard still works.
export const FX_ENV_ON = import.meta.env.VITE_FX !== "off";

export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}
