import { useEffect, useState } from "react";
import type { Alert, CaseDetail } from "../../../shared/types";
import { api } from "../api";
import { AlertCard } from "./AlertCard";

interface Props {
  caseId: string;
  version: number;
  alerts: Alert[];
  onClose: () => void;
  onOpenCase: (id: string) => void;
}

const humanType = (t: string) => t.charAt(0) + t.slice(1).toLowerCase().replace(/_/g, " ");

export function CaseDrawer({ caseId, version, alerts, onClose, onOpenCase }: Props) {
  const [detail, setDetail] = useState<CaseDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    api
      .case(caseId)
      .then((d) => live && (setDetail(d), setError(null)))
      .catch((e) => live && setError(String(e)));
    return () => {
      live = false;
    };
  }, [caseId, version]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const caseAlerts = alerts.filter((a) => a.caseIds.includes(caseId));
  const est = detail?.estimate;

  return (
    <div className="drawer-scrim" onClick={onClose}>
      <aside className="drawer" role="dialog" aria-label={`Case ${caseId}`} onClick={(e) => e.stopPropagation()}>
        <header className="drawer-head">
          <div>
            <h2 className="mono">{caseId}</h2>
            {detail && (
              <p className="drawer-sub">
                {detail.specimen} · {detail.cohort}
                {detail.programmeTag && <> · {detail.programmeTag}</>}
              </p>
            )}
          </div>
          {detail?.priority === "Urgent" && <span className="chip-urgent">Urgent</span>}
          <button className="btn-quiet" onClick={onClose} aria-label="Close">
            Close ✕
          </button>
        </header>
        {error && <p className="error">Could not load case: {error}</p>}
        {detail && (
          <div className="drawer-body">
            <section>
              <h3>Recorded stage</h3>
              <p className="stage-now">
                {detail.stage} <span className="muted mono">since {detail.stageEnteredAt}</span>
              </p>
            </section>

            <section>
              <h3>Handoff estimate</h3>
              {est?.status === "ready" && <p className="est-ready">Ready for pathologist handoff</p>}
              {est?.status === "estimated" && <p className="mono">{est.readyAt}</p>}
              {est?.status === "unknown" && <p className="muted">Unknown: {est.reasonUnknown}</p>}
              {est && est.components.length > 0 && (
                <ul className="est-parts">
                  {est.components.map((c, i) => (
                    <li key={i}>
                      {c.step}
                      {c.minutes !== undefined && <span className="mono"> {c.minutes} min</span>}
                      {c.note && <span className="muted"> — {c.note}</span>}
                    </li>
                  ))}
                </ul>
              )}
              {est && est.assumptions.length > 0 && <p className="muted small">Assumptions: {est.assumptions.join("; ")}</p>}
            </section>

            {caseAlerts.length > 0 && (
              <section>
                <h3>Alerts</h3>
                {caseAlerts.map((a) => (
                  <AlertCard key={a.id} alert={a} onOpenCase={onOpenCase} />
                ))}
              </section>
            )}

            <section>
              <h3>Blocks</h3>
              <table className="mini">
                <thead>
                  <tr>
                    <th>Block</th>
                    <th>Location</th>
                    <th>Status</th>
                    <th>Levels</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.blocks.map((b) => (
                    <tr key={b.blockId}>
                      <td className="mono">{b.blockId}</td>
                      <td>{b.location}</td>
                      <td>{b.status}</td>
                      <td className="mono">{b.levelsRequired ? `${b.levelsRecorded} of ${b.levelsRequired}` : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            {detail.slides.length > 0 && (
              <section>
                <h3>Slides</h3>
                <p className="mono slide-list">
                  {detail.slides.map((s) => `${s.slideId}${s.level ? ` (${s.level})` : ""}`).join(" · ")}
                </p>
              </section>
            )}

            <section>
              <h3>Recorded timeline</h3>
              <ol className="timeline">
                {[...detail.timeline].reverse().map((e) => (
                  <li key={e.eventId}>
                    <span className="mono tl-time">{e.at}</span>
                    <span className="tl-type">
                      {humanType(e.type)}
                      {e.blockId && <span className="mono"> · {e.blockId}</span>}
                    </span>
                    <span className="tl-detail">
                      {e.details}
                      {e.station && <span className="muted"> · {e.station}</span>}
                    </span>
                  </li>
                ))}
              </ol>
            </section>
          </div>
        )}
      </aside>
    </div>
  );
}
