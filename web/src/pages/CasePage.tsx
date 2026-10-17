import { useEffect, useState } from "react";
import type { Alert, CaseDetail } from "../../../shared/types";
import { api } from "../api";
import { TimeFlow } from "../components/Flow";
import { JourneyBar } from "../components/JourneyBar";
import { Link, paths } from "../router";

const humanType = (t: string) => t.charAt(0) + t.slice(1).toLowerCase().replace(/_/g, " ");
const fmtDuration = (m: number) => (m >= 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${m} min`);

/** Stations visited, in recorded order with times (consecutive repeats merged). */
function stationsVisited(d: CaseDetail) {
  const out: { station: string; at: string; type: string }[] = [];
  for (const e of d.timeline) {
    if (!e.station || e.type === "CURRENT_STAGE_SNAPSHOT") continue;
    if (out.at(-1)?.station === e.station) continue;
    out.push({ station: e.station, at: e.at, type: e.type });
  }
  return out;
}

/** Full case page (spec Screen C), reached from search, lists, both simulations and incidents. */
export function CasePage({ caseId, version, alerts }: { caseId: string; version: number; alerts: Alert[] }) {
  const [d, setD] = useState<CaseDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    api
      .case(caseId)
      .then((x) => live && (setD(x), setError(null)))
      .catch(() => live && setError(`No case ${caseId} in the simulated dataset.`));
    return () => {
      live = false;
    };
  }, [caseId, version]);

  if (error) return <section className="page"><h1>{caseId}</h1><p className="empty-state">{error}</p></section>;
  if (!d) return <section className="page"><p className="muted">Loading {caseId}…</p></section>;
  const linked = alerts.filter((a) => a.caseIds.includes(d.caseId));
  const est = d.estimate;
  const visited = stationsVisited(d);
  const now = d.blocks.length > 1 ? [...new Set(d.blocks.map((b) => b.location))].join(" · ") : (d.blocks[0]?.location ?? "Not recorded");

  return (
    <section className="page case-page">
      <header className="page-head">
        <div>
          <h1 className="mono">{d.caseId}</h1>
          <p className="page-sub">
            {d.specimen} · {d.cohort}
          </p>
        </div>
        <div className="tags">
          {d.priority === "Urgent" && <span className="tag tag-urgent">Urgent</span>}
          {d.programmeTag === "BCSP" && <span className="tag tag-bcsp">BCSP</span>}
          {d.programmeTag === "Cervical screening" && <span className="tag tag-csp">Cervical screening</span>}
        </div>
      </header>

      <div className="case-grid">
        <div className="case-main">
          <section className="panel">
            <h2>Where it is now</h2>
            <p className="stage-now">
              {d.stage} <span className="muted mono">since {d.stageEnteredAt}</span>
            </p>
            <p className="muted">Location: {now}</p>
            <p className="muted">
              Staff:{" "}
              {d.timeline.some((e) => e.initials)
                ? `${[...new Set(d.timeline.filter((e) => e.initials).map((e) => `${e.initials} at ${e.station}`))].join(", ")} (fictional initials; traceability only)`
                : "Staff not recorded"}
            </p>
            <JourneyBar detail={d} alerts={linked} />
          </section>

          <section className="panel">
            <h2>Why is it waiting?</h2>
            {d.waiting.missing === null ? (
              <p className="est-ready">Nothing: lab preparation is complete.</p>
            ) : (
              <p className="waiting">
                <span className="muted">Latest event: </span>
                {d.waiting.latest ? (
                  <>
                    <span className="mono">{d.waiting.latest.at}</span> · {d.waiting.latest.text} <span className="mono ev-id">{d.waiting.latest.eventId}</span>
                  </>
                ) : (
                  "none recorded"
                )}
                <br />
                <span className="muted">Missing next: </span>
                <b>{d.waiting.missing}</b>
              </p>
            )}
          </section>

          <section className="panel">
            <h2>Handoff to the pathologist</h2>
            {est.status === "ready" && <p className="est-ready">Ready since {est.readyAt}</p>}
            {est.status === "estimated" && (
              <p className="est-line">
                <TimeFlow className="mono est-time" value={est.readyAt!} />
                <span className="muted"> · active {est.activeMinutes} min · wall-clock {fmtDuration(est.wallClockMinutes ?? 0)}</span>
              </p>
            )}
            {est.status === "unknown" && <p className="est-unknown">Unknown: {est.reasonUnknown}</p>}
            {est.components.length > 0 && (
              <ul className="est-parts">
                {est.components.map((c, i) => (
                  <li key={i} className={c.step.startsWith("Repeat") ? "est-repeat" : ""}>
                    <span>{c.step}</span>
                    <span className="mono est-min">{c.minutes !== undefined ? `${c.minutes} min` : ""}</span>
                    {(c.note || c.ruleId) && (
                      <span className="est-note muted">
                        {c.note}
                        {c.note && c.ruleId ? " · " : ""}
                        {c.ruleId && `rule: ${c.ruleId}`}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {est.assumptions.length > 0 && <p className="muted small">Assumptions: {est.assumptions.join("; ")}</p>}
            {est.target && <p className="muted small">Target: {typeof est.target === "string" ? est.target : `${est.target.label}, due ${est.target.dueAt}`}</p>}
          </section>

          <section className="panel">
            <h2>Blocks, slides and levels</h2>
            <table className="mini">
              <thead>
                <tr>
                  <th>Block</th>
                  <th>Stage</th>
                  <th>Location</th>
                  <th>Levels recorded / required</th>
                </tr>
              </thead>
              <tbody>
                {d.blocks.map((b) => (
                  <tr key={b.blockId}>
                    <td className="mono">{b.blockId}</td>
                    <td>{b.stage ?? <span className="muted">not enough information</span>}</td>
                    <td>{b.location}</td>
                    <td className={`mono ${b.levelsRequired && (b.levelsRecorded ?? 0) < b.levelsRequired && (b.levelsRecorded ?? 0) > 0 ? "alert-text" : ""}`}>
                      {b.levelsRequired ? `${b.levelsRecorded} of ${b.levelsRequired}` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {d.slides.length > 0 && (
              <p className="mono slide-list">
                Slides: {d.slides.map((s) => `${s.slideId}${s.level ? ` (${s.level})` : ""}${s.basket ? ` · ${s.basket}` : ""}`).join(" · ")}
              </p>
            )}
          </section>
        </div>

        <aside className="case-side">
          <section className="panel">
            <h2>Linked incidents</h2>
            {linked.length === 0 && <p className="muted">None.</p>}
            {linked.map((a) => (
              <Link key={a.id} to={paths.incident(a.id)} className="incident-link">
                <span className="flag" aria-hidden>
                  !
                </span>
                <span>
                  {a.what}
                  <br />
                  <span className="muted small">{a.state.replace("_", " ")}</span>
                </span>
              </Link>
            ))}
          </section>
          <section className="panel">
            <h2>Stations, in recorded order</h2>
            <ol className="visited">
              {visited.map((v, i) => (
                <li key={i}>
                  <span className="mono muted">{v.at}</span> {v.station}
                </li>
              ))}
              {visited.length === 0 && <li className="muted">No station events recorded (background case).</li>}
            </ol>
          </section>
          <section className="panel">
            <h2>Recorded timeline</h2>
            <ol className="timeline">
              {[...d.timeline].reverse().map((e) => (
                <li key={e.eventId}>
                  <span className="mono tl-time">{e.at}</span>
                  <span className="tl-type">
                    {humanType(e.type)}
                    {e.blockId && <span className="mono"> · {e.blockId}</span>}
                  </span>
                  <span className="tl-detail">
                    {e.details}
                    {e.initials && <span className="muted"> · recorded by {e.initials} (fictional)</span>}
                    {e.station && <span className="muted"> · {e.station}</span>}
                  </span>
                </li>
              ))}
            </ol>
          </section>
        </aside>
      </div>
    </section>
  );
}
