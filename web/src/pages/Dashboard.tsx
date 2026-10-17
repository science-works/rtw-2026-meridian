import { useState } from "react";
import type { Alert, CaseSummary, Overview } from "../../../shared/types";
import { api } from "../api";
import { Donut } from "../components/Donut";
import { Count } from "../components/Flow";
import { FlagArea } from "../components/FlagArea";
import { CaseLine } from "../caseLine";
import { Link, navigate, paths } from "../router";
import { SearchIcon } from "../theme/icons";

interface Props {
  overview: Overview;
  cases: CaseSummary[];
  alerts: Alert[];
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

/** Main dashboard (Victoria's design): status at a glance, calm; detail lives on section pages. */
export function Dashboard({ overview: o, cases, alerts }: Props) {
  const urgent = cases
    .filter((c) => c.priority === "Urgent")
    .sort((a, b) => Number(a.stage === "Ready for pathologist handoff") - Number(b.stage === "Ready for pathologist handoff") || a.caseId.localeCompare(b.caseId));
  const group = (tag: string) => cases.filter((c) => c.programmeTag === tag);
  const ready = (cs: CaseSummary[]) => cs.filter((c) => c.stage === "Ready for pathologist handoff").length;
  const bcsp = group("BCSP");
  const csp = group("Cervical screening");
  return (
    <div className="dash">
      <section className="dash-hero">
        <div className="logo-placeholder" aria-label="Logo placeholder">
          MERIDIAN
        </div>
        <Link to={paths.section("all")} className="hero-total">
          <Count className="hero-number mono" value={o.total} />
          <span className="hero-label">total cases</span>
        </Link>
        <div className="hero-split">
          <Link to={paths.section("new")}>
            <Count className="mono" value={o.today} /> new
          </Link>
          <span aria-hidden>·</span>
          <Link to={paths.section("backlog")}>
            <Count className="mono" value={o.backlog} /> backlog
          </Link>
        </div>
        <CaseSearch big />
      </section>

      <section className="dash-grid">
        <Link to={paths.section("emitted")} className="panel donut-panel">
          <h2>Left the lab to the pathologist</h2>
          <Donut done={o.ready} total={o.total} />
        </Link>

        <div className="panel urgent-panel">
          <div className="panel-head">
            <h2>
              <span className="urgent-flag" aria-hidden>
                !
              </span>{" "}
              Urgent
            </h2>
            <Link to={paths.section("urgent")} className="panel-link">
              All <Count className="mono" value={o.urgent} />
            </Link>
          </div>
          <ul className="urgent-list">
            {urgent.slice(0, 5).map((c) => (
              <li key={c.caseId}>
                <Link to={paths.case(c.caseId)} className="urgent-row">
                  <CaseLine c={c} />
                </Link>
              </li>
            ))}
          </ul>
          {urgent.length > 5 && (
            <Link to={paths.section("urgent")} className="panel-link">
              +{urgent.length - 5} more urgent cases
            </Link>
          )}
        </div>

        <div className="tile-stack">
          <Link to={paths.section("bcsp")} className="panel tile tile-bcsp">
            <span className="tile-title">BCSP screening</span>
            <Donut done={ready(bcsp)} total={bcsp.length} size={84} color="var(--bcsp)" />
          </Link>
          <Link to={paths.section("csp")} className="panel tile tile-csp">
            <span className="tile-title">Cervical screening (CSP)</span>
            <Donut done={ready(csp)} total={csp.length} size={84} color="var(--csp)" />
          </Link>
          <Link to={paths.section("cytopathology")} className="panel tile">
            <span className="tile-title">Diagnostic cytopathology</span>
            <span className="tile-empty">No cases received today</span>
          </Link>
          <Link to={paths.incidents} className="panel tile tile-incidents">
            <span className="tile-title">Incidents</span>
            <span className="tile-empty">
              <Count className="mono" value={o.openAttention} /> open
            </span>
          </Link>
        </div>
      </section>

      <FlagArea alerts={alerts} />
    </div>
  );
}
