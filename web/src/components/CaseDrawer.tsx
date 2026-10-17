import { useEffect, useState } from "react";
import type { Alert, CaseDetail } from "../../../shared/types";
import { api } from "../api";
import { AlertCard } from "./AlertCard";
import { TimeFlow } from "./Flow";
import { JourneyBar } from "./JourneyBar";
import { Spotlight } from "./Spotlight";

interface Props {
  caseId: string;
  version: number;
  alerts: Alert[];
  onClose: () => void;
  onOpenCase: (id: string) => void;
}

const fmtDuration = (m: number) => (m >= 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${m} min`);
const humanType = (t: string) => t.charAt(0) + t.slice(1).toLowerCase().replace(/_/g, " ");

export function CaseDrawer({ caseId, version, alerts, onClose, onOpenCase }: Props) {
  const [detail, setDetail] = useState<CaseDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [spot, setSpot] = useState(false);

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
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !spot && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, spot]);

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
          <button className="btn-quiet" onClick={() => setSpot(true)}>
            Spotlight
          </button>
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
              <JourneyBar detail={detail} alerts={caseAlerts} />
            </section>

            <section>
              <h3>Why is it waiting?</h3>
              {detail.waiting.missing === null ? (
                <p className="est-ready">Nothing: lab preparation is complete.</p>
              ) : (
                <p className="waiting">
                  <span className="muted">Latest event: </span>
                  {detail.waiting.latest ? (
                    <>
                      <span className="mono">{detail.waiting.latest.at}</span> · {detail.waiting.latest.text} <span className="mono ev-id">{detail.waiting.latest.eventId}</span>
                    </>
                  ) : (
                    "none recorded"
                  )}
                  <br />
                  <span className="muted">Missing next: </span>
                  <b>{detail.waiting.missing}</b>
                </p>
              )}
            </section>

            <section>
              <h3>Handoff estimate</h3>
              {est?.status === "ready" && <p className="est-ready">Ready for pathologist handoff</p>}
              {est?.status === "estimated" && (
                <p className="est-line">
                  <TimeFlow className="mono est-time" value={est.readyAt!} />
                  <span className="muted">
                    {" "}
                    · active {est.activeMinutes} min · wall-clock {fmtDuration(est.wallClockMinutes ?? 0)}
                  </span>
                </p>
              )}
              {est?.status === "unknown" && <p className="est-unknown">Unknown: {est.reasonUnknown}</p>}
              {est && est.components.length > 0 && (
                <ul className="est-parts">
                  {est.components.map((c, i) => (
                    <li key={i} className={c.step.startsWith("Repeat") ? "est-repeat" : ""}>
                      <span>{c.step}</span>
                      <span className="mono est-min">{c.minutes !== undefined ? `${c.minutes} min` : ""}</span>
                      {c.note && <span className="est-note muted">{c.note}</span>}
                    </li>
                  ))}
                </ul>
              )}
              {est && est.assumptions.length > 0 && <p className="muted small">Assumptions: {est.assumptions.join("; ")}</p>}
              {est?.target && (
                <p className="small">
                  {typeof est.target === "string" ? (
                    <span className="muted">Target: {est.target}</span>
                  ) : (
                    <span className={est.target.late ? "error" : ""}>
                      Target ({est.target.label}): due {est.target.dueAt}
                      {est.target.late ? " — past target" : " — within target"}
                    </span>
                  )}
                </p>
              )}
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
                    <th>Stage</th>
                    <th>Location</th>
                    <th>Status</th>
                    <th>Levels</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.blocks.map((b) => (
                    <tr key={b.blockId}>
                      <td className="mono">{b.blockId}</td>
                      <td>{b.stage ?? <span className="muted">not enough information</span>}</td>
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
                      {e.initials && <span className="muted"> · recorded by {e.initials} (fictional)</span>}
                      {e.basket && <span className="muted"> · {[e.box, e.basket].filter(Boolean).join(" / ")}</span>}
                      {e.station && <span className="muted"> · {e.station}</span>}
                    </span>
                  </li>
                ))}
              </ol>
            </section>
          </div>
        )}
      </aside>
      {spot && <Spotlight caseId={caseId} onClose={() => setSpot(false)} />}
    </div>
  );
}
