// Story mode in the demo window: follows the pitch/SCRIPT.md beats. When a beat's cue names a
// screen, it opens that screen; every live action (typing a case ID, Play, double-click, Acknowledge)
// is left to the presenter, so nothing on screen is faked. Moves in step with /presenter.
import { useCallback, useEffect, useRef, useState } from "react";
import { routeForCue } from "../../../shared/script";
import { navigate } from "../router";
import { openChannel, useScript } from "./script";

const inField = (t: EventTarget | null) => t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));

export function StoryBar({ active, onActive }: { active: boolean; onActive: (v: boolean) => void }) {
  const { script } = useScript();
  const [index, setIndexState] = useState(0);
  const indexRef = useRef(0);
  const setIndex = (n: number) => {
    indexRef.current = n;
    setIndexState(n);
  };
  const chan = useRef<ReturnType<typeof openChannel> | null>(null);

  const show = useCallback(
    (n: number) => {
      if (!script) return;
      setIndex(n);
      const route = routeForCue(script.cards[n]?.cue);
      if (route) navigate(route);
    },
    [script],
  );

  useEffect(() => {
    chan.current = openChannel((m) => {
      if (m.type === "beat") {
        onActive(true);
        show(m.index);
      }
    });
    return () => chan.current?.close();
  }, [show, onActive]);

  const go = useCallback(
    (delta: number) => {
      if (!script) return;
      const n = indexRef.current + delta;
      if (n >= script.cards.length) {
        onActive(false);
        navigate("/"); // end on the normal, fully clickable dashboard
        return;
      }
      if (n < 0) return;
      show(n);
      chan.current?.post({ type: "beat", index: n });
    },
    [script, show, onActive],
  );

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (inField(e.target)) return;
      if (e.key === "ArrowRight") (e.preventDefault(), go(1));
      if (e.key === "ArrowLeft") (e.preventDefault(), go(-1));
      if (e.key === "Escape") onActive(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, go, onActive]);

  // Entering Story mode opens the first beat's screen.
  const entered = useRef(false);
  useEffect(() => {
    if (active && script && !entered.current) {
      entered.current = true;
      show(index);
    }
    if (!active) entered.current = false;
  }, [active, script, index, show]);

  if (!active || !script) return null;
  return (
    <div className="storyline" role="region" aria-label="Story mode">
      <span className="story-label">Story</span>
      <span className="mono">
        {index + 1}/{script.cards.length}
      </span>
      <button className="btn-quiet small" onClick={() => go(-1)} disabled={index === 0} aria-label="Previous beat">
        ←
      </button>
      <button className="btn-quiet small" onClick={() => go(1)} aria-label="Next beat">
        →
      </button>
      <button className="btn-quiet small" onClick={() => onActive(false)}>
        Exit
      </button>
    </div>
  );
}
