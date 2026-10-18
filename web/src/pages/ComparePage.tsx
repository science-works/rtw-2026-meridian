// Side by side for one case: the same recorded events, as a LIMS lists them (left) and as
// Meridian reads them (right). Default 26H1004. Nothing on the left is coloured or estimated.
import { useEffect, useState } from "react";
import type { Alert, CaseDetail } from "../../../shared/types";
import { etaText } from "../caseLine";
import { AlertCard } from "../components/AlertCard";
import { Link, navigate, paths } from "../router";
import { stationsVisited } from "./CasePage";
import { vizOn } from "../vizFlags";
import { BiopsyStrip } from "../viz/BiopsyStrip";

export const COMPARE_DEFAULT = "26H1004";

export function ComparePage({ caseId, alerts, version }: { caseId: string; alerts: Alert[]; version: number }) {
  const [d, setD] = useState<CaseDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    setError(null);
    fetch(`/api/cases/${encodeURIComponent(caseId)}`)
      .then(async (r) => (r.ok ? (r.json() as Promise<CaseDetail>) : Promise.reject(new Error(((await r.json()) as { error: string }).error))))
      .then((x) => live && setD(x))
      .catch((e: Error) => live && setError(e.message));
    return () => {
      live = false;
    };
  }, [caseId, version]);

  const linked = d ? alerts.filter((a) => d.alertIds.includes(a.id) && a.state !== "resolved") : [];
  const eta = d ? etaText(d) : null;

  return (
    <section className={`compare${vizOn(1) ? " with-strip" : ""}`}>
      {vizOn(1) && <BiopsyStrip />}
      <header className="compare-head">
        <p className="compare-caption">Same events. One records what happened; the other shows what&apos;s happening.</p>
        <form
          className="compare-pick"
          onSubmit={(e) => {
            e.preventDefault();
            const v = new FormData(e.currentTarget).get("id");
            if (typeof v === "string" && v.trim()) navigate(paths.compare(v.trim().toUpperCase()));
          }}
        >
          <label>
            Case <input name="id" defaultValue={caseId} key={caseId} className="mono" aria-label="Case ID to compare" />
          </label>
          <button className="btn-quiet" type="submit">
            Compare
          </button>
        </form>
      </header>
      {error && <p className="error">{error}</p>}
      {d && (
        <div className="compare-split">
          <section className="compare-lims" aria-label="A LIMS today">
            <h2>A LIMS today</h2>
            <p className="lims-sub">
              {d.timeline.length} events for {d.caseId}, oldest first.
            </p>
            <div className="lims-scroll">
              <table className="lims-table" data-testid="compare-lims">
                <thead>
                  <tr>
                    <th>Event ID</th>
                    <th>Time</th>
                    <th>Block / slide</th>
                    <th>Station</th>
                    <th>Event type</th>
                  </tr>
                </thead>
                <tbody>
                  {d.timeline.map((e) => (
                    <tr key={e.eventId}>
                      <td>{e.eventId}</td>
                      <td>{e.at}</td>
                      <td>{[e.blockId, e.slideId].filter(Boolean).join(" / ") || "—"}</td>
                      <td>{e.station ?? "—"}</td>
                      <td>{e.type}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="compare-meridian" aria-label="Meridian">
            <h2>
              Meridian · <Link to={paths.case(d.caseId)} className="mono">{d.caseId}</Link>
              {d.priority === "Urgent" && <span className="tag tag-urgent">Urgent</span>}
            </h2>
            <p className="compare-now">
              Now: <strong>{d.location}</strong> · {d.stage}
            </p>
            <ol className="visited" aria-label="Station journey">
              {stationsVisited(d).map((v, i) => (
                <li key={i}>
                  <span className="mono muted">{v.at}</span> {v.station}
                </li>
              ))}
            </ol>
            {eta && (
              <p className={`compare-eta ${eta.tone}`} data-testid="compare-eta">
                {eta.tone === "eta" ? `Ready for pathologist ~${eta.text.replace(/^Ready ~/, "")}` : eta.text}
                {eta.reason && <span className="muted"> — {eta.reason}</span>}
              </p>
            )}
            {linked.length === 0 ? (
              <p className="muted">No open incident for this case.</p>
            ) : (
              linked.map((a) => <AlertCard key={a.id} alert={a} onOpenCase={(id) => navigate(paths.case(id))} />)
            )}
            {linked.map((a) => (
              <Link key={a.id} to={paths.incident(a.id)} className="panel-link">
                Open the incident
              </Link>
            ))}
          </section>
        </div>
      )}
    </section>
  );
}
