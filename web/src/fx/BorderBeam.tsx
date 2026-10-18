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
// Source: apps/www/registry/magicui/border-beam.tsx. Meridian changes: one token colour per use
// (var(--urgent) on the urgent card, var(--attention) on the incident flag), a slow 8 s loop,
// plain CSS in magic.css instead of Tailwind classes, no cn helper.
import { motion } from "motion/react";
import { useRef } from "react";
import { useFxFlag } from "../fxFlags";
import { useHost } from "./MagicCard";
import "./magic.css";

interface Props {
  /** A CSS variable from the theme, e.g. "var(--urgent)". */
  color: string;
  /** Width of the host's border, so the beam runs exactly on it. */
  borderWidth?: number;
  size?: number;
  /** Seconds per lap (kept slow, at least 6 s). */
  duration?: number;
}

/** Motion Pack 9: a short light travelling round the parent's border. */
export function BorderBeam(p: Props) {
  const on = useFxFlag(9);
  return on ? <Beam {...p} /> : null;
}

function Beam({ color, borderWidth = 1, size = 70, duration = 8 }: Props) {
  const ref = useRef<HTMLSpanElement>(null);
  useHost(ref);
  return (
    <span
      ref={ref}
      className="fx-beam"
      aria-hidden
      style={{ inset: -borderWidth, borderWidth, ["--beam" as string]: color }}
    >
      <motion.span
        className="fx-beam-dot"
        style={{ width: size, offsetPath: `rect(0 auto auto 0 round ${size}px)` }}
        initial={{ offsetDistance: "0%" }}
        animate={{ offsetDistance: ["0%", "100%"] }}
        transition={{ repeat: Infinity, ease: "linear", duration: Math.max(6, duration) }}
      />
    </span>
  );
}
