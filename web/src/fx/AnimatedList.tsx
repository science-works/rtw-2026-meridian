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
// Source: apps/www/registry/magicui/animated-list.tsx. Meridian changes: instead of wrapping
// children (which would break table rows and the end-to-end selectors), a hook staggers the
// existing rows in once on first render, all within 900 ms, then never again (no loop, no
// reordering). Uses the Web Animations API; nothing is hidden when the effect is off.
import { useLayoutEffect, useRef } from "react";
import { useFxFlag } from "../fxFlags";

const TOTAL_MS = 900;
const ITEM_MS = 320;

/** Motion Pack 11: attach the returned ref to a list or table; its `selector` rows enter one after another. */
export function useAnimatedList<T extends HTMLElement>(selector: string, count: number) {
  const on = useFxFlag(11);
  const ref = useRef<T>(null);
  const done = useRef(false);
  useLayoutEffect(() => {
    const root = ref.current;
    if (!on || done.current || !root || count === 0) return;
    done.current = true;
    const items = Array.from(root.querySelectorAll<HTMLElement>(selector));
    const step = items.length > 1 ? Math.min(80, (TOTAL_MS - ITEM_MS) / (items.length - 1)) : 0;
    items.forEach((el, i) =>
      el.animate?.(
        [
          { opacity: 0, transform: "translateY(8px) scale(0.985)" },
          { opacity: 1, transform: "none" },
        ],
        { duration: ITEM_MS, delay: i * step, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)", fill: "backwards" },
      ),
    );
  }, [on, count, selector]);
  return ref;
}
