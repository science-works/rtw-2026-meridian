// Adapted from Magic UI (https://github.com/magicuidesign/magicui), MIT License.
//
// Copyright (c) Magic UI
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.
//
// Source: apps/www/registry/magicui/magic-card.tsx ("gradient" mode only). Meridian changes: an
// overlay placed inside an existing element (no wrapper, no layout change), project tokens instead
// of stock colours, no next-themes / cn / Tailwind classes, and nothing renders at rest.
import { useLayoutEffect, useRef, type RefObject } from "react";
import { useFxFlag } from "../fxFlags";
import "./magic.css";

/** Make the overlay's parent a positioned, isolated host; restores the inline styles on unmount. */
export function useHost(ref: RefObject<HTMLElement | null>, isolate = false) {
  useLayoutEffect(() => {
    const host = ref.current?.parentElement;
    if (!host) return;
    const prev = { position: host.style.position, isolation: host.style.isolation };
    if (getComputedStyle(host).position === "static") host.style.position = "relative";
    if (isolate) host.style.isolation = "isolate";
    return () => {
      host.style.position = prev.position;
      host.style.isolation = prev.isolation;
    };
  }, [ref, isolate]);
}

/** Motion Pack 8: a soft accent spotlight under the pointer while hovering the parent element. */
/** `soft` fades the glow out at the edges, for hosts without a card border (the station header). */
export function MagicSpotlight({ size = 220, soft = false }: { size?: number; soft?: boolean }) {
  const on = useFxFlag(8);
  return on ? <Spot size={size} soft={soft} /> : null;
}

function Spot({ size, soft }: { size: number; soft: boolean }) {
  const ref = useRef<HTMLSpanElement>(null);
  useHost(ref, true);
  useLayoutEffect(() => {
    const me = ref.current;
    const host = me?.parentElement;
    if (!me || !host) return;
    const move = (e: PointerEvent) => {
      const r = host.getBoundingClientRect();
      me.style.setProperty("--mx", `${e.clientX - r.left}px`);
      me.style.setProperty("--my", `${e.clientY - r.top}px`);
    };
    const enter = (e: PointerEvent) => {
      move(e);
      me.dataset.on = "1";
    };
    const leave = () => delete me.dataset.on;
    host.addEventListener("pointermove", move);
    host.addEventListener("pointerenter", enter);
    host.addEventListener("pointerleave", leave);
    window.addEventListener("blur", leave);
    return () => {
      host.removeEventListener("pointermove", move);
      host.removeEventListener("pointerenter", enter);
      host.removeEventListener("pointerleave", leave);
      window.removeEventListener("blur", leave);
    };
  }, []);
  return <span ref={ref} className={soft ? "fx-spot fx-spot-soft" : "fx-spot"} aria-hidden style={{ ["--spot" as string]: `${size}px` }} />;
}
