import { useEffect, useState } from "react";
import { useFxFlag } from "../fxFlags";
import { useFx } from "../fx";
import { CornerLayer, cornersOn } from "../corners/CornerLayer";
import type { Alert, CaseSummary, Overview } from "../../../shared/types";
import { api } from "../api";
import { Donut } from "../components/Donut";
import { Count } from "../components/Flow";
import { FlagArea } from "../components/FlagArea";
import { CaseLine } from "../caseLine";
import { Link, navigate, paths } from "../router";
import { SearchIcon } from "../theme/icons";
import { MagicSpotlight } from "../fx/MagicCard";
import { BorderBeam } from "../fx/BorderBeam";

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

/** Urgent rows shown on the dashboard; rows wrap rather than truncate, the rest are one click away. */
const URGENT_ROWS = 3;
const WOKE_KEY = "meridian.woke";

/** Motion Pack 5: true for the first ~1.2 s of the first dashboard load in this browser session. */
function useWake(): { waking: boolean; zero: boolean } {
  const on = useFxFlag(5);
  const [first] = useState(() => {
    if (!on) return false;
    try {
      if (sessionStorage.getItem(WOKE_KEY)) return false;
      sessionStorage.setItem(WOKE_KEY, "1");
    } catch {
      /* storage blocked: wake every time */
    }
    return true;
  });
  const [zero, setZero] = useState(first);
  const [waking, setWaking] = useState(first);
  useEffect(() => {
    if (!first) return;
    const a = setTimeout(() => setZero(false), 60);
    const b = setTimeout(() => setWaking(false), 1200);
    return () => (clearTimeout(a), clearTimeout(b));
  }, [first]);
  return { waking, zero };
}

/** Main dashboard (Victoria's design): status at a glance, calm; detail lives on section pages. */
export function Dashboard({ overview: o, cases, alerts }: Props) {
  const wake = useWake();
  const fx = useFx();
  const z = (n: number) => (wake.zero ? 0 : n);
  const urgent = cases
    .filter((c) => c.priority === "Urgent")
    .sort((a, b) => Number(a.stage === "Ready for pathologist handoff") - Number(b.stage === "Ready for pathologist handoff") || a.caseId.localeCompare(b.caseId));
  const group = (tag: string) => cases.filter((c) => c.programmeTag === tag);
  const ready = (cs: CaseSummary[]) => cs.filter((c) => c.stage === "Ready for pathologist handoff").length;
  const bcsp = group("BCSP");
  const csp = group("Cervical screening");
  return (
    <div className={`dash${wake.waking ? " waking" : ""}`}>
      {cornersOn && <CornerLayer overview={o} cases={cases} alerts={alerts} motion={fx.on} />}
      <section className="dash-hero">
        <Link to={paths.section("all")} className="hero-total">
          <Count className="hero-number mono" value={z(o.total)} />
          <span className="hero-label">total cases</span>
        </Link>
        <div className="hero-split">
          <Link to={paths.section("new")}>
            <Count className="mono" value={z(o.today)} /> new
          </Link>
          <span aria-hidden>·</span>
          <Link to={paths.section("backlog")}>
            <Count className="mono" value={z(o.backlog)} /> backlog
          </Link>
        </div>
        <CaseSearch big />
      </section>

      <section className="dash-grid">
        <Link to={paths.section("emitted")} className="panel donut-panel">
          <h2>Left the lab to the pathologist</h2>
          <Donut done={o.ready} total={o.total} size={180} />
          <MagicSpotlight size={280} />
        </Link>

        <div className="panel urgent-panel">
          <BorderBeam color="var(--urgent)" borderWidth={2} />
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
            {urgent.slice(0, URGENT_ROWS).map((c) => (
              <li key={c.caseId}>
                <Link to={paths.case(c.caseId)} className="urgent-row">
                  <CaseLine c={c} />
                </Link>
              </li>
            ))}
          </ul>
          {urgent.length > URGENT_ROWS && (
            <Link to={paths.section("urgent")} className="panel-link">
              +{urgent.length - URGENT_ROWS} more urgent cases
            </Link>
          )}
        </div>

        <div className="tile-stack">
          <Link to={paths.section("bcsp")} className="panel tile tile-bcsp">
            <span className="tile-title">BCSP screening</span>
            <Donut done={ready(bcsp)} total={bcsp.length} size={84} color="var(--bcsp)" />
            <MagicSpotlight />
          </Link>
          <Link to={paths.section("csp")} className="panel tile tile-csp">
            <span className="tile-title">Cervical screening (CSP)</span>
            <Donut done={ready(csp)} total={csp.length} size={84} color="var(--csp)" />
            <MagicSpotlight />
          </Link>
          <Link to={paths.section("cytopathology")} className="panel tile">
            <span className="tile-title">Diagnostic cytopathology</span>
            <span className="tile-empty">No cases received today</span>
            <MagicSpotlight />
          </Link>
          <Link to={paths.incidents} className="panel tile tile-incidents">
            <span className="tile-title">Incidents</span>
            <span className="tile-empty">
              <Count className="mono" value={o.openAttention} /> open
            </span>
            <MagicSpotlight />
          </Link>
        </div>
      </section>

      <FlagArea alerts={alerts} dropIn={wake.waking} />
    </div>
  );
}
