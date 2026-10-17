// Meridian chat, docked on every page (spec Screen E). Deterministic: GET /api/chat answers from
// the same read functions as the dashboard; no model, nothing written.
import { useEffect, useRef, useState } from "react";
import type { ChatAnswer } from "../../../shared/types";
import { Link } from "../router";
import { SendIcon } from "../theme/icons";

export const SUGGESTED = [
  "Where is case 26H2345?",
  "Why is 26H1004 waiting?",
  "Which cases are in Processor D?",
  "Which cases are affected by H&E-BASKET-01?",
  "What is holding the urgent cases?",
  "Which screening-linked cases may reach the pathologist later than expected?",
];

export function ChatDock() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [thread, setThread] = useState<(ChatAnswer | { question: string; error: string })[]>([]);
  const threadRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Scroll only the thread (scrollIntoView would also scroll the app shell).
  useEffect(() => {
    const el = threadRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [thread]);
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const ask = async (question: string) => {
    if (!question.trim() || busy) return;
    setBusy(true);
    setQ("");
    try {
      const r = await fetch(`/api/chat?q=${encodeURIComponent(question)}`);
      if (!r.ok) throw new Error(String(r.status));
      const a = (await r.json()) as ChatAnswer;
      setThread((t) => [...t, a]);
    } catch (e) {
      setThread((t) => [...t, { question, error: `Cannot reach the Meridian API (${(e as Error).message}).` }]);
    } finally {
      setBusy(false);
    }
  };

  if (!open)
    return (
      <button className="chat-tab" onClick={() => setOpen(true)} aria-expanded={false}>
        Ask Meridian
      </button>
    );

  return (
    <aside className="chat-dock" aria-label="Meridian chat">
      <header className="chat-head">
        <div>
          <h2>Ask Meridian</h2>
          <p className="muted">Answers come from the same rules as the dashboard. Read-only; no AI model in this panel.</p>
        </div>
        <button className="btn-quiet small" onClick={() => setOpen(false)} aria-label="Close chat">
          Close
        </button>
      </header>
      <div className="chat-thread" ref={threadRef}>
        {thread.length === 0 && (
          <div className="chat-suggest">
            <p className="muted">Try one of these:</p>
            {SUGGESTED.map((s) => (
              <button key={s} className="chat-chip" onClick={() => void ask(s)}>
                {s}
              </button>
            ))}
          </div>
        )}
        {thread.map((a, i) => (
          <article key={i} className="chat-turn">
            <p className="chat-q">{a.question}</p>
            {"error" in a ? (
              <p className="error">{a.error}</p>
            ) : (
              <div className="chat-a">
                <p className="chat-answer">{a.answer}</p>
                {a.facts.length > 0 && (
                  <ul className="chat-facts">
                    {a.facts.slice(0, 12).map((f, j) => (
                      <li key={j}>{f}</li>
                    ))}
                    {a.facts.length > 12 && <li className="muted">+{a.facts.length - 12} more</li>}
                  </ul>
                )}
                {a.links.length > 0 && (
                  <p className="chat-links">
                    {a.links.map((l) => (
                      <Link key={l.to} to={l.to} className="chat-link">
                        {l.label}
                      </Link>
                    ))}
                  </p>
                )}
                {a.sources.length > 0 && <p className="chat-sources mono">from {a.sources.join(" · ")}</p>}
              </div>
            )}
          </article>
        ))}
      </div>
      <form
        className="chat-form"
        onSubmit={(e) => {
          e.preventDefault();
          void ask(q);
        }}
      >
        <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ask about a case, station or incident" aria-label="Question" />
        <button className="btn-trigger" type="submit" disabled={busy || !q.trim()} aria-label="Ask">
          <SendIcon />
        </button>
      </form>
      {thread.length > 0 && (
        <div className="chat-more">
          {SUGGESTED.map((s, i) => (
            <button key={s} className="chat-chip small" onClick={() => void ask(s)} title={s}>
              Q{i + 1}
            </button>
          ))}
        </div>
      )}
    </aside>
  );
}
