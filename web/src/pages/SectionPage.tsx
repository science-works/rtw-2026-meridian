import type { Alert, CaseSummary, Overview } from "../../../shared/types";
import { useMemo } from "react";
import { seriesFor } from "../../../shared/simulation";
import { CaseLine } from "../caseLine";
import { Donut } from "../components/Donut";
import { OverTime } from "../components/OverTime";
import { Link, navigate, paths } from "../router";
import { useTimeline } from "../useTimeline";

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

/** Section pages behind the dashboard's numbers and tiles: completion donut, cleared over time, the case list. */
export function SectionPage({ name, cases, alerts }: { name: string; cases: CaseSummary[]; alerts: Alert[]; overview: Overview }) {
  const s = SECTIONS[name];
  const { data: tl } = useTimeline();
  const rowsAll = s ? cases.filter(s.filter) : [];
  const ids = rowsAll.map((c) => c.caseId).join(",");
  const series = useMemo(() => (tl && ids ? seriesFor(tl.timeline, ids.split(","), tl.from, tl.to) : []), [tl, ids]);
  if (!s) return <section className="page"><h1>Not found</h1><p className="empty-state">No section “{name}”.</p></section>;
  const flagged = new Set(alerts.filter((a) => a.state !== "resolved").flatMap((a) => a.caseIds));
  const rows = [...rowsAll].sort(
    (a, b) => Number(b.priority === "Urgent") - Number(a.priority === "Urgent") || Number(flagged.has(b.caseId)) - Number(flagged.has(a.caseId)) || a.caseId.localeCompare(b.caseId),
  );
  const done = rows.filter((c) => c.stage === "Ready for pathologist handoff").length;
  return (
    <section className="page">
      <header className="page-head">
        <div>
          <p className="page-kicker">
            <Link to="/">Dashboard</Link> · section
          </p>
          <h1>{s.title}</h1>
          <p className="page-sub">
            {rows.length} case{rows.length === 1 ? "" : "s"}
            {s.note ? ` · ${s.note}` : ""}
          </p>
        </div>
      </header>
      {rows.length === 0 ? (
        <section className="panel">
          <p className="empty-state">{name === "cytopathology" ? "No diagnostic cytopathology cases (cell blocks and clots) were received today. Search any case ID, including archived ones, from the search box." : "No cases in this section."}</p>
        </section>
      ) : (
        <div className="section-grid">
          <aside className="section-side">
            <section className="panel donut-panel">
              <h2>Ready for pathologist handoff</h2>
              <Donut done={done} total={rows.length} />
            </section>
            <section className="panel">
              <h2>Over time</h2>
              {series.length ? <OverTime series={series} /> : <p className="muted">Loading the recorded events…</p>}
            </section>
          </aside>
          <section className="panel table-panel">
            <h2>Cases ({rows.length})</h2>
            <ul className="case-rows section-rows">
              {rows.map((c) => (
                <li key={c.caseId} className={c.priority === "Urgent" ? "is-urgent-row" : undefined}>
                  <button className="case-row" onClick={() => navigate(paths.case(c.caseId))}>
                    {flagged.has(c.caseId) ? (
                      <span className="flag sm" aria-label="open incident">
                        !
                      </span>
                    ) : (
                      <span className="flag-space" />
                    )}
                    <CaseLine c={c} />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}
    </section>
  );
}
