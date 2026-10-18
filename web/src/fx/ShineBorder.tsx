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
// Source: apps/www/registry/magicui/shine-border.tsx. Meridian changes: plays ONCE when it mounts
// (900 ms, then fades out) instead of looping, accent token colour, CSS in magic.css, no cn helper.
import { useRef } from "react";
import { useFxFlag } from "../fxFlags";
import { useHost } from "./MagicCard";
import "./magic.css";

/** Motion Pack 10: a one-time shine round the parent's edge when it first appears. */
export function ShineBorder({ color = "var(--accent)", delayMs = 0 }: { color?: string; delayMs?: number }) {
  const on = useFxFlag(10);
  return on ? <Shine color={color} delayMs={delayMs} /> : null;
}

function Shine({ color, delayMs }: { color: string; delayMs: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  useHost(ref);
  return (
    <span
      ref={ref}
      className="fx-shine"
      aria-hidden
      style={{
        backgroundImage: `radial-gradient(transparent, transparent, ${color}, transparent, transparent)`,
        animationDelay: `${delayMs}ms`,
      }}
    />
  );
}
