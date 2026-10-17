import { useState } from "react";
import type { CaseSummary, Overview } from "../../../shared/types";
import { api } from "../api";
import { Donut } from "../components/Donut";
import { Count, TimeFlow } from "../components/Flow";
import { Link, navigate, paths } from "../router";
import { SearchIcon } from "../theme/icons";

interface Props {
  overview: Overview;
  cases: CaseSummary[];
  openIncidents: number;
}

export function CaseSearch({ big }: { big?: boolean }) {
  const [q, setQ] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <form
      className={`case-search ${big ? "big" : ""}`}
      role="search"
      onSubmit={async (e) => {
        e.preventDefault();
        const id = q.trim().toUpperCase();
        if (!id) return;
        try {
          await api.case(id);
          setMsg(null);
          setQ("");
          navigate(paths.case(id));
        } catch {
          setMsg(`No case ${id} in the simulated dataset`);
        }
      }}
    >
      <SearchIcon />
      <input value={q} onChange={(e) => (setQ(e.target.value), setMsg(null))} placeholder={big ? "Find a case: e.g. 26H2345" : "Case ID"} aria-label="Search case ID" />
      {msg && <span className="search-msg">{msg}</span>}
    </form>
  );
}

const statusOf = (c: CaseSummary) =>
  c.estimate.status === "ready" ? <span className="est-ready">Ready</span> : c.estimate.status === "estimated" ? <TimeFlow className="mono" value={c.estimate.readyAt!} /> : <span className="muted">Unknown</span>;

/** Main dashboard (Victoria's design): status at a glance, calm; detail lives on section pages. */
export function Dashboard({ overview: o, cases, openIncidents }: Props) {
  const urgent = cases.filter((c) => c.priority === "Urgent").sort((a, b) => Number(a.stage === "Ready for pathologist handoff") - Number(b.stage === "Ready for pathologist handoff") || a.caseId.localeCompare(b.caseId));
  const bcsp = cases.filter((c) => c.programmeTag === "BCSP").length;
  const csp = cases.filter((c) => c.programmeTag === "Cervical screening").length;
  return (
    <div className="dash">
      <section className="dash-hero">
        <Link to={paths.section("all")} className="hero-total">
          <Count className="hero-number mono" value={o.total} />
          <span className="hero-label">cases in the lab today</span>
        </Link>
        <div className="hero-split">
          <Link to={paths.section("new")}>
            <Count className="mono" value={o.today} /> new today
          </Link>
          <span aria-hidden>·</span>
          <Link to={paths.section("backlog")}>
            <Count className="mono" value={o.backlog} /> backlog from yesterday
          </Link>
        </div>
        <CaseSearch big />
      </section>

      <section className="dash-grid">
        <Link to={paths.section("emitted")} className="panel donut-panel">
          <h2>Completed</h2>
          <Donut done={o.ready} total={o.total} />
          <p className="muted">Left the lab: ready or emitted to the pathologist</p>
        </Link>

        <div className="panel urgent-panel">
          <div className="panel-head">
            <h2>
              <span className="flag" aria-hidden>
                !
              </span>{" "}
              Urgent cases
            </h2>
            <Link to={paths.section("urgent")} className="panel-link">
              All <Count className="mono" value={o.urgent} />
            </Link>
          </div>
          <ul className="urgent-list">
            {urgent.slice(0, 6).map((c) => (
              <li key={c.caseId}>
                <Link to={paths.case(c.caseId)} className="urgent-row">
                  <span className="mono case-id">{c.caseId}</span>
                  <span className="urgent-stage">{c.stage}</span>
                  <span className="urgent-status">{statusOf(c)}</span>
                </Link>
              </li>
            ))}
          </ul>
          {urgent.length > 6 && (
            <Link to={paths.section("urgent")} className="panel-link">
              +{urgent.length - 6} more urgent cases
            </Link>
          )}
        </div>

        <div className="tile-stack">
          <Link to={paths.section("bcsp")} className="panel tile tile-bcsp">
            <span className="tile-kicker">Screening</span>
            <span className="tile-title">BCSP</span>
            <Count className="tile-number mono" value={bcsp} />
          </Link>
          <Link to={paths.section("csp")} className="panel tile tile-csp">
            <span className="tile-kicker">Screening</span>
            <span className="tile-title">Cervical (CSP)</span>
            <Count className="tile-number mono" value={csp} />
          </Link>
          <Link to={paths.section("cytopathology")} className="panel tile">
            <span className="tile-kicker">Diagnostic cytopathology</span>
            <span className="tile-empty">No cases received today</span>
          </Link>
          <Link to={paths.incidents} className="panel tile tile-incidents">
            <span className="tile-kicker">Incidents</span>
            <span className="tile-title">
              <Count className="mono" value={openIncidents} /> open
            </span>
          </Link>
        </div>
      </section>
    </div>
  );
}
