// Speaker notes (/presenter): pitch/SCRIPT.md verbatim as cards, a 3:00 countdown that starts on
// the first →, the attention tone from 2:45. Arrow keys move the demo window's Story mode in step.
import { useCallback, useEffect, useRef, useState } from "react";
import type { ScriptCard } from "../../../shared/script";
import { openChannel, useScript } from "../story/script";
import { vizOn } from "../vizFlags";
import { BiopsyStrip } from "../viz/BiopsyStrip";

const TOTAL = 180;
/** The script marks cuttable lines with a scissors sign (U+2702). */
const CUT_MARK = "\u2702";
const LATE_AT = 165;

const fmt = (s: number) => `${s < 0 ? "+" : ""}${Math.floor(Math.abs(s) / 60)}:${String(Math.floor(Math.abs(s) % 60)).padStart(2, "0")}`;

function Card({ card, big }: { card: ScriptCard; big?: boolean }) {
  return (
    <article className={`pr-card ${big ? "big" : "next"}`}>
      <p className="pr-meta">
        <span>{card.section}</span>
        {card.window && <span className="mono">{card.window}</span>}
      </p>
      <p className="pr-speaker">
        {card.speaker}
        {card.cue && <span className="pr-cue">[{card.cue}]</span>}
      </p>
      {big && vizOn(1) && card.section.startsWith("1 ·") && <BiopsyStrip />}
      {card.extra && card.lines.length === 0 && <p className="pr-line muted">Added screen: no script line. Show the side-by-side, then move on.</p>}
      {card.lines.map((l, i) => (
        <p key={i} className={`pr-line${l.startsWith(CUT_MARK) ? " cut" : ""}`}>
          {l}
        </p>
      ))}
    </article>
  );
}

export function PresenterPage() {
  const { script, error } = useScript();
  const [index, setIndex] = useState(-1); // -1: not started
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const chan = useRef<ReturnType<typeof openChannel> | null>(null);

  useEffect(() => {
    chan.current = openChannel((m) => {
      if (m.type === "beat") setIndex(m.index);
    });
    return () => chan.current?.close();
  }, []);

  useEffect(() => {
    if (startedAt === null) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [startedAt]);

  const go = useCallback(
    (delta: number) => {
      if (!script) return;
      setIndex((i) => {
        const n = Math.max(-1, Math.min(script.cards.length - 1, i + delta));
        if (n !== i && n >= 0) chan.current?.post({ type: "beat", index: n });
        return n;
      });
      if (delta > 0) setStartedAt((s) => s ?? Date.now());
    },
    [script],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "PageDown" || e.key === " ") (e.preventDefault(), go(1));
      if (e.key === "ArrowLeft" || e.key === "PageUp") (e.preventDefault(), go(-1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  if (error) return <main className="presenter"><p className="error">Cannot load pitch/SCRIPT.md ({error}).</p></main>;
  if (!script) return <main className="presenter"><p className="muted">Loading the script…</p></main>;

  const elapsed = startedAt === null ? 0 : (now - startedAt) / 1000;
  const remaining = TOTAL - elapsed;
  const current = index >= 0 ? script.cards[index] : null;
  const next = script.cards[index + 1];

  return (
    <main className="presenter">
      <header className="pr-head">
        <div>
          <h1>{script.title}</h1>
          <p className="muted">{script.notes.join(" ")}</p>
        </div>
        <div className={`pr-timer mono${elapsed >= LATE_AT ? " late" : ""}`} role="timer" aria-live="off" data-testid="pr-timer">
          {fmt(Math.ceil(remaining))}
        </div>
      </header>

      <section className="pr-stage">
        {current ? (
          <Card card={current} big />
        ) : (
          <article className="pr-card big">
            <p className="pr-speaker">Ready</p>
            <p className="pr-line">Press → to start. The 3:00 countdown starts on the first →.</p>
          </article>
        )}
        <div className="pr-side">
          <p className="pr-next-label">Next</p>
          {next ? <Card card={next} /> : <p className="pr-line muted">End of script.</p>}
        </div>
      </section>

      <footer className="pr-foot">
        <button className="btn-quiet pr-btn" onClick={() => go(-1)} disabled={index < 0}>
          ← Back
        </button>
        <span className="mono pr-count">
          {Math.max(0, index + 1)} / {script.cards.length}
        </span>
        <button className="btn-trigger pr-btn" onClick={() => go(1)} disabled={index >= script.cards.length - 1}>
          Next →
        </button>
        <button className="btn-quiet pr-btn" onClick={() => (setStartedAt(null), setIndex(-1))}>
          Restart
        </button>
        <button className="btn-quiet pr-btn" onClick={() => window.open("/?story=1", "meridian-demo")}>
          Open demo window
        </button>
        <p className="pr-never">{script.never.join(" ")}</p>
      </footer>
    </main>
  );
}
