import type { Alert, CaseSummary, StationCard } from "../../../shared/types";
import { CaseLine } from "../caseLine";
import { BasketGrid } from "../flow/LabFlow";
import { Link, navigate, paths } from "../router";
import { stageOfNode } from "../theme/looks";
import { MagicSpotlight } from "../fx/MagicCard";

/** Station page: who is there (recorded initials only), current cases, queue, load, its incident. */
export function StationPage({ id, stations, cases, alerts }: { id: string; stations: StationCard[]; cases: CaseSummary[]; alerts: Alert[] }) {
  const card = stations.find((s) => s.id === id);
  if (!card) return <section className="page"><h1>Station</h1><p className="empty-state">No station “{id}” on the lab-flow map.</p></section>;
  const rows = cases.filter((c) => card.caseIds.includes(c.caseId));
  const incidents = alerts.filter((a) => a.state !== "resolved" && (a.where.includes(card.label) || a.caseIds.some((c) => card.caseIds.includes(c))));
  const initials = card.initials?.length ? [...new Set(card.initials.map((i) => i.initials))].join(", ") : null;
  return (
    <section className="page" data-stage={stageOfNode(card.id)}>
      <header className="page-head">
        <div>
          <p className="page-kicker">{card.zone}</p>
          <h1>{card.label}</h1>
          <p className="page-sub">{card.state}</p>
        </div>
        <MagicSpotlight size={260} soft />
      </header>
      <div className="case-grid">
        <div className="case-main">
          {card.baskets && (
            <section className="panel">
              <h2>Boxes and baskets</h2>
              <BasketGrid card={card} onOpenCase={(c) => navigate(paths.case(c))} />
            </section>
          )}
          <section className="panel table-panel">
            <h2>
              {card.kind === "queue" ? "Queue" : "Current cases"} ({rows.length})
            </h2>
            {rows.length === 0 ? (
              <p className="empty-state">No case recorded here now.</p>
            ) : (
              <ul className="case-rows">
                {rows.map((c) => (
                  <li key={c.caseId}>
                    <button className="case-row" onClick={() => navigate(paths.case(c.caseId))}>
                      <CaseLine c={c} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className="panel table-panel">
            <h2>Worked here earlier ({card.workedTotal ?? 0} recorded events)</h2>
            {!card.worked?.length ? (
              <p className="empty-state">No recorded event at this station.</p>
            ) : (
              <>
                <ul className="worked-rows">
                  {card.worked.map((w) => (
                    <li key={w.eventId}>
                      <span className="mono">{w.at}</span>
                      <Link to={paths.case(w.caseId)} className="mono">
                        {w.caseId}
                      </Link>
                      <span>{w.text}</span>
                      {w.initials && <span className="muted mono">{w.initials}</span>}
                    </li>
                  ))}
                </ul>
                {(card.workedTotal ?? 0) > card.worked.length && <p className="muted">Showing the latest {card.worked.length}.</p>}
              </>
            )}
          </section>
        </div>
        <aside className="case-side">
          <section className="panel">
            <h2>Who is at the station</h2>
            <p>{initials ? `Recorded initials: ${initials} (fictional; traceability only, never ranked)` : "Staff not recorded"}</p>
          </section>
          <section className="panel">
            <h2>Load and capacity</h2>
            <p>{card.load ?? "Not recorded"}</p>
            {card.items?.map((i) => (
              <p key={i} className="mono">
                {i}
              </p>
            ))}
          </section>
          <section className="panel">
            <h2>Latest and next</h2>
            <p>
              <span className="muted">Latest event: </span>
              {card.latestEvent ? `${card.latestEvent.at} · ${card.latestEvent.text}` : "None recorded here"}
            </p>
            {card.nextMilestone && (
              <p>
                <span className="muted">Next expected: </span>
                {card.nextMilestone.text}
                {card.nextMilestone.rule && <span className="muted"> ({card.nextMilestone.rule})</span>}
              </p>
            )}
          </section>
          <section className="panel">
            <h2>Incidents here</h2>
            {incidents.length === 0 && <p className="muted">None open.</p>}
            {incidents.map((a) => (
              <Link key={a.id} to={paths.incident(a.id)} className="incident-link">
                <span className="flag" aria-hidden>
                  !
                </span>
                <span>{a.what}</span>
              </Link>
            ))}
          </section>
        </aside>
      </div>
    </section>
  );
}
