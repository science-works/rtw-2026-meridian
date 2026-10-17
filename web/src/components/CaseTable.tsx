import { useMemo, useState } from "react";
import type { Alert, CaseSummary, Stage } from "../../../shared/types";
import { TimeFlow } from "./Flow";

interface Props {
  cases: CaseSummary[];
  alerts: Alert[];
  stage: Stage | null;
  onClearStage: () => void;
  onOpenCase: (id: string) => void;
  pulse: Set<string>;
}

type Scope = "demo" | "flagged" | "all";

export function CaseTable({ cases, alerts, stage, onClearStage, onOpenCase, pulse }: Props) {
  const [scope, setScope] = useState<Scope>("demo");
  const [query, setQuery] = useState("");
  const flagged = useMemo(() => new Set(alerts.flatMap((a) => a.caseIds)), [alerts]);

  const rows = useMemo(() => {
    const q = query.trim().toUpperCase();
    return cases
      .filter((c) => !stage || c.stage === stage)
      .filter((c) => (q ? c.caseId.includes(q) : scope === "all" || stage !== null || (scope === "demo" ? c.isDemo : flagged.has(c.caseId))))
      .sort((a, b) => Number(flagged.has(b.caseId)) - Number(flagged.has(a.caseId)) || Number(b.priority === "Urgent") - Number(a.priority === "Urgent") || a.caseId.localeCompare(b.caseId));
  }, [cases, stage, scope, query, flagged]);

  return (
    <section className="cases" aria-label="Cases">
      <header className="cases-head">
        <h2>{stage ? stage : "Cases"}</h2>
        <span className="muted">{rows.length} shown</span>
        {stage && (
          <button className="btn-quiet small" onClick={onClearStage}>
            Clear stage filter
          </button>
        )}
        <div className="scope" role="group" aria-label="Which cases">
          {(["demo", "flagged", "all"] as Scope[]).map((s) => (
            <button key={s} className={scope === s ? "on" : ""} onClick={() => setScope(s)} disabled={stage !== null}>
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
                key={c.caseId}
                data-case={c.caseId}
                onClick={() => onOpenCase(c.caseId)}
                className={`${flagged.has(c.caseId) ? "flagged" : ""} ${pulse.has(c.caseId) ? "pulse" : ""}`}
              >
                <td className="mono case-id">
                  {flagged.has(c.caseId) && <span className="dot-alert" aria-label="flagged" />}
                  {c.caseId}
                </td>
                <td>{c.specimen}</td>
                <td>{c.priority === "Urgent" ? <span className="chip-urgent">Urgent</span> : <span className="muted">Routine</span>}</td>
                <td>{c.programmeTag ?? <span className="muted">—</span>}</td>
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
