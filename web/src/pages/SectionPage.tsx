import type { Alert, CaseSummary, Overview } from "../../../shared/types";
import { TimeFlow } from "../components/Flow";
import { navigate, paths } from "../router";

export const SECTIONS: Record<string, { title: string; note?: string; filter: (c: CaseSummary) => boolean }> = {
  all: { title: "All tracked cases", filter: () => true },
  new: { title: "New today (current-day workload)", filter: (c) => c.cohort === "Current-day workload" },
  backlog: { title: "Backlog from the previous day", filter: (c) => c.cohort === "Previous-day backlog" },
  urgent: { title: "Urgent cases", note: "Urgency is the recorded priority. No faults are invented.", filter: (c) => c.priority === "Urgent" },
  bcsp: { title: "BCSP (bowel screening)", note: "Times refer to lab handoff only, never the programme deadline.", filter: (c) => c.programmeTag === "BCSP" },
  csp: { title: "Cervical screening (CSP)", note: "Times refer to lab handoff only, never the programme deadline.", filter: (c) => c.programmeTag === "Cervical screening" },
  emitted: { title: "Completed: left the lab", note: "Ready for, or emitted to, the pathologist.", filter: (c) => c.stage === "Ready for pathologist handoff" },
  cytopathology: { title: "Diagnostic cytopathology", filter: () => false },
};

/** Section pages behind the dashboard's numbers and tiles. */
export function SectionPage({ name, cases, alerts }: { name: string; cases: CaseSummary[]; alerts: Alert[]; overview: Overview }) {
  const s = SECTIONS[name];
  if (!s) return <section className="page"><h1>Not found</h1><p className="empty-state">No section “{name}”.</p></section>;
  const flagged = new Set(alerts.filter((a) => a.state !== "resolved").flatMap((a) => a.caseIds));
  const rows = cases.filter(s.filter).sort((a, b) => Number(flagged.has(b.caseId)) - Number(flagged.has(a.caseId)) || a.caseId.localeCompare(b.caseId));
  return (
    <section className="page">
      <header className="page-head">
        <div>
          <h1>{s.title}</h1>
          <p className="page-sub">
            {rows.length} case{rows.length === 1 ? "" : "s"}
            {s.note ? ` · ${s.note}` : ""}
          </p>
        </div>
      </header>
      {name === "cytopathology" ? (
        <p className="empty-state">No cases received today (cell blocks and clots). Search the mock archive by case ID from the search box.</p>
      ) : (
        <section className="panel table-panel">
          <table className="mini">
            <thead>
              <tr>
                <th>Case</th>
                <th>Specimen</th>
                <th>Recorded stage</th>
                <th>Since</th>
                <th>Handoff estimate</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.caseId} onClick={() => navigate(paths.case(c.caseId))}>
                  <td className="mono case-id">
                    {flagged.has(c.caseId) && (
                      <span className="flag sm" aria-label="open incident">
                        !
                      </span>
                    )}{" "}
                    {c.caseId}
                    {c.priority === "Urgent" && <span className="tag tag-urgent sm">Urgent</span>}
                  </td>
                  <td>{c.specimen}</td>
                  <td>{c.stage}</td>
                  <td className="mono">{c.stageEnteredAt}</td>
                  <td>{c.estimate.status === "ready" ? <span className="est-ready">Ready</span> : c.estimate.status === "estimated" ? <TimeFlow className="mono" value={c.estimate.readyAt!} /> : <span className="muted">Unknown</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </section>
  );
}
