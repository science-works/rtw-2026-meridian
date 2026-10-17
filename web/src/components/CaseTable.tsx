import { useMemo, useState } from "react";
import type { Alert, CaseSummary, Stage } from "../../../shared/types";
import { TimeFlow } from "./Flow";
import type { CaseScope } from "./HeadlineCounts";

interface Props {
  cases: CaseSummary[];
  alerts: Alert[];
  stage: Stage | null;
  scope: CaseScope;
  onScope: (s: CaseScope) => void;
  onClearStage: () => void;
  onOpenCase: (id: string) => void;
  pulse: Set<string>;
  /** Cases an AI agent is reading right now (agent console). */
  glow?: Set<string>;
}

const SCOPE_TITLE: Record<CaseScope, string> = {
  all: "All tracked cases",
  demo: "Demo cases",
  flagged: "Cases with open attention items",
  urgent: "Urgent cases",
  screening: "Screening-linked cases (lab handoff only)",
  backlog: "Previous-day backlog",
  today: "Current-day workload",
  ready: "Ready for pathologist handoff",
};

export function CaseTable({ cases, alerts, stage, scope, onScope, onClearStage, onOpenCase, pulse, glow }: Props) {
  const [query, setQuery] = useState("");
  const flagged = useMemo(() => new Set(alerts.filter((a) => a.state !== "resolved").flatMap((a) => a.caseIds)), [alerts]);

  const rows = useMemo(() => {
    const q = query.trim().toUpperCase();
    const inScope = (c: CaseSummary) =>
      scope === "all" ||
      (scope === "demo" && c.isDemo) ||
      (scope === "flagged" && flagged.has(c.caseId)) ||
      (scope === "urgent" && c.priority === "Urgent") ||
      (scope === "screening" && c.programmeTag !== null) ||
      (scope === "backlog" && c.cohort === "Previous-day backlog") ||
      (scope === "today" && c.cohort === "Current-day workload") ||
      (scope === "ready" && c.stage === "Ready for pathologist handoff");
    return cases
      .filter((c) => !stage || c.stage === stage)
      .filter((c) => (q ? c.caseId.includes(q) : stage !== null || inScope(c)))
      .sort((a, b) => Number(flagged.has(b.caseId)) - Number(flagged.has(a.caseId)) || Number(b.priority === "Urgent") - Number(a.priority === "Urgent") || a.caseId.localeCompare(b.caseId));
  }, [cases, stage, scope, query, flagged]);

  return (
    <section className="cases" aria-label="Cases">
      <header className="cases-head">
        <h2>{stage ? stage : SCOPE_TITLE[scope]}</h2>
        <span className="muted">{rows.length} shown</span>
        {stage && (
          <button className="btn-quiet small" onClick={onClearStage}>
            Clear stage filter
          </button>
        )}
        <div className="scope" role="group" aria-label="Which cases">
          {(["demo", "flagged", "all"] as CaseScope[]).map((s) => (
            <button key={s} className={scope === s ? "on" : ""} onClick={() => onScope(s)} disabled={stage !== null}>
              {s === "demo" ? "Demo cases" : s === "flagged" ? "Flagged" : "All 450"}
            </button>
          ))}
        </div>
        <input className="search mono" placeholder="Find case ID…" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Find case ID" />
      </header>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Case</th>
              <th>Specimen</th>
              <th>Priority</th>
              <th>Programme</th>
              <th>Stage</th>
              <th>Since</th>
              <th>Handoff estimate</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr
                style={pulse.has(c.caseId) ? ({ "--i": [...pulse].filter((id) => id.startsWith("26H")).sort().indexOf(c.caseId) } as React.CSSProperties) : undefined}
                key={c.caseId}
                data-case={c.caseId}
                onClick={() => onOpenCase(c.caseId)}
                className={`${flagged.has(c.caseId) ? "flagged" : ""} ${pulse.has(c.caseId) ? "pulse" : ""} ${glow?.has(c.caseId) ? "agent-glow" : ""}`}
              >
                <td className="mono case-id">
                  {flagged.has(c.caseId) && (
                    <span className="dot-alert" aria-label="open attention item">
                      !
                    </span>
                  )}
                  {c.caseId}
                </td>
                <td>{c.specimen}</td>
                <td>{c.priority === "Urgent" ? <span className="chip-urgent">Urgent</span> : <span className="muted">Routine</span>}</td>
                <td>
                  {c.programmeTag === "BCSP" ? (
                    <span className="tag tag-bcsp">BCSP</span>
                  ) : c.programmeTag === "Cervical screening" ? (
                    <span className="tag tag-cervical">Cervical</span>
                  ) : c.programmeTag ? (
                    c.programmeTag
                  ) : (
                    <span className="muted">—</span>
                  )}
                </td>
                <td>{c.stage}</td>
                <td className="mono">{c.stageEnteredAt}</td>
                <td>
                  {c.estimate.status === "ready" ? (
                    <span className="est-ready">Ready</span>
                  ) : c.estimate.status === "estimated" ? (
                    <TimeFlow className="mono" value={c.estimate.readyAt!} />
                  ) : (
                    <span className="muted" title={c.estimate.reasonUnknown}>
                      Unknown
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
