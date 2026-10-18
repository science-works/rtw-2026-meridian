// Corner instruments on the dashboard (preview ?corners=1, off by default). They sit in the empty space
// beside the hero (top) and beside the incident flag (bottom). After every layout a guard hides any
// corner that would touch main content, so the dashboard itself never moves or gets covered.
import { useLayoutEffect, useRef, useState } from "react";
import type { CornerProps } from "./types";
import { TopLeft } from "./TopLeft";
import { TopRight } from "./TopRight";
import { BottomLeft } from "./BottomLeft";
import { BottomRight } from "./BottomRight";

const KEY = "meridian.corners";
/** Approved: on by default. ?corners=0 turns them off for this tab, ?corners=1 back on. */
const DEFAULT_ON = true;

function readFlag(): boolean {
  try {
    const q = new URLSearchParams(window.location.search).get("corners");
    if (q === "1" || q === "0") sessionStorage.setItem(KEY, q);
    const v = sessionStorage.getItem(KEY);
    return v === null ? DEFAULT_ON : v === "1";
  } catch {
    return new URLSearchParams(window.location.search).get("corners") === "1";
  }
}
export const cornersOn = typeof window === "undefined" ? false : readFlag();

/** Main content the corners must never touch. */
const MAIN = [".hero-total", ".hero-split", ".dash-hero .case-search", ".dash-grid > *", ".flag-card", ".flag-hint", ".flag-none"];
const touches = (a: DOMRect, b: DOMRect, pad: number) => a.left < b.right + pad && a.right > b.left - pad && a.top < b.bottom + pad && a.bottom > b.top - pad;

export function CornerLayer(props: CornerProps) {
  const layer = useRef<HTMLDivElement>(null);
  const [bottomTop, setBottomTop] = useState<number | null>(null);
  const [hidden, setHidden] = useState<Record<string, boolean>>({});

  useLayoutEffect(() => {
    const el = layer.current;
    const dash = el?.parentElement;
    if (!el || !dash) return;
    const place = () => {
      // Bottom corners sit in the band below the card grid, beside the incident flag.
      const grid = dash.querySelector(".dash-grid");
      const d = dash.getBoundingClientRect();
      if (grid) setBottomTop(grid.getBoundingClientRect().bottom - d.top + 12);
      requestAnimationFrame(() => {
        const main = MAIN.flatMap((s) => [...dash.querySelectorAll(s)]).map((m) => m.getBoundingClientRect()).filter((r) => r.width && r.height);
        const next: Record<string, boolean> = {};
        for (const c of el.querySelectorAll<HTMLElement>("[data-slot]")) {
          const r = c.getBoundingClientRect();
          // Hide when it would touch content, leave the dashboard, or run under the footer (visible page area).
          const view = dash.closest(".page-wrap")?.getBoundingClientRect() ?? d;
          next[c.dataset.slot!] = main.some((m) => touches(r, m, 4)) || r.left < d.left || r.right > d.right || r.bottom > Math.min(d.bottom, view.bottom);
        }
        setHidden((h) => (JSON.stringify(h) === JSON.stringify(next) ? h : next));
      });
    };
    place();
    const settle = setTimeout(place, 1400); // after the dashboard's wake-up animation
    const ro = new ResizeObserver(place);
    ro.observe(dash);
    window.addEventListener("resize", place);
    return () => (clearTimeout(settle), ro.disconnect(), window.removeEventListener("resize", place));
  }, [props.alerts]);

  const slot = (name: string, style: React.CSSProperties, node: React.ReactNode) => (
    <div className="corner-slot" data-slot={name} style={{ ...style, visibility: hidden[name] ? "hidden" : "visible" }} aria-hidden={hidden[name] || undefined}>
      {node}
    </div>
  );
  return (
    <div className="corner-layer" ref={layer}>
      {slot("top-left", { top: 16, left: 32 }, <TopLeft {...props} />)}
      {slot("top-right", { top: 16, right: 32 }, <TopRight {...props} />)}
      {bottomTop !== null && slot("bottom-left", { top: bottomTop, left: 32 }, <BottomLeft {...props} />)}
      {bottomTop !== null && slot("bottom-right", { top: bottomTop, right: 32 }, <BottomRight {...props} />)}
    </div>
  );
}
