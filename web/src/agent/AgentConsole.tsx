import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import type { AgentActivity } from "../../../shared/types";

interface Props {
  activity: AgentActivity[];
  onOpenCase: (id: string) => void;
  onClear: () => void;
}

const TOOL_LABEL: Record<string, string> = {
  list_alerts: "list_alerts",
  get_case: "get_case",
  cases_delayed: "cases_delayed",
  overview_resource: "overview",
};

/**
 * What an AI agent is reading right now, through Meridian's MCP tools. Every row is a real
 * API call the MCP server made; the text is built by Meridian's code, never by the model.
 */
export function AgentConsole({ activity, onOpenCase, onClear }: Props) {
  const [open, setOpen] = useState(false); // secondary in v7: collapsed until an agent calls

  const [now, setNow] = useState(Date.now());
  const [lastSeen, setLastSeen] = useState<number | null>(null);

  useEffect(() => {
    if (activity.length) {
      setLastSeen(Date.now());
      setOpen(true);
    }
  }, [activity.length]);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const live = lastSeen !== null && now - lastSeen < 5000;

  // Newest first, grouped by run (one shift_handover = one run).
  const groups: { key: string; runId?: string; rows: AgentActivity[] }[] = [];
  for (const a of [...activity].reverse()) {
    const g = groups.find((x) => a.runId && x.runId === a.runId);
    if (g) g.rows.push(a);
    else groups.push({ key: a.runId ?? `single-${a.id}`, runId: a.runId, rows: [a] });
  }

  return (
    <section className={`agent-console ${open ? "open" : ""}`} aria-label="Agent console">
      <header className="agent-head">
        <button className="agent-badge" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
          <span className={`agent-dot ${live ? "on" : ""}`} aria-hidden />
          Claude via MCP · read-only
        </button>
        <span className="muted small">{activity.length ? `${activity.length} call${activity.length === 1 ? "" : "s"}` : "waiting"}</span>
        {activity.length > 0 && (
          <button className="btn-quiet small" onClick={onClear}>
            Clear
          </button>
        )}
      </header>
      {open && (
        <div className="agent-list">
          {activity.length === 0 && <p className="muted small agent-empty">When an agent calls Meridian's tools, each call appears here.</p>}
          <AnimatePresence initial={false}>
            {groups.map((g) => (
              <motion.div key={g.key} className={`agent-group ${g.runId ? "run" : ""}`} layout initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
                {g.runId && <div className="agent-run">Agent run · {g.rows.length} call{g.rows.length === 1 ? "" : "s"}</div>}
                {g.rows.map((a) => (
                  <div key={a.id} className="agent-row">
                    <span className="mono agent-time">{a.at}</span>
                    <span className="mono agent-tool">{TOOL_LABEL[a.tool] ?? a.tool}</span>
                    <span className="agent-summary">{a.resultSummary}</span>
                    {a.caseIds.length > 0 && a.caseIds.length <= 4 && (
                      <span className="agent-chips">
                        {a.caseIds.map((id) => (
                          <button key={id} className="chip mono" onClick={() => onOpenCase(id)}>
                            {id}
                          </button>
                        ))}
                      </span>
                    )}
                  </div>
                ))}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </section>
  );
}
