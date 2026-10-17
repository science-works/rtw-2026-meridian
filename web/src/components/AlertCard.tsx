import type { Alert } from "../../../shared/types";

const KIND_LABEL: Record<Alert["kind"], string> = {
  outstanding_block: "Outstanding block",
  protocol_mismatch: "Protocol mismatch",
  basket_failure: "Stain run failure",
  scan_gap: "Missing scan event",
};

interface Props {
  alert: Alert;
  onOpenCase: (id: string) => void;
  pulse?: boolean;
  compact?: boolean;
}

/** Every alert shows what, the evidence, why it is flagged, and the suggested staff check. */
export function AlertCard({ alert, onOpenCase, pulse, compact }: Props) {
  const tone = alert.kind === "outstanding_block" ? "hold" : "alert";
  const evidence = compact ? alert.evidence.slice(0, 2) : alert.evidence;
  return (
    <article className={`alert-card ${tone} ${pulse ? "pulse" : ""}`} aria-label={KIND_LABEL[alert.kind]}>
      <header className="alert-head">
        <span className="alert-kind">{KIND_LABEL[alert.kind]}</span>
        <span className="mono alert-time">{alert.raisedAt}</span>
      </header>
      <h3 className="alert-what">{alert.what}</h3>
      <div className="alert-cases">
        {alert.caseIds.map((id) => (
          <button key={id} className="chip mono" onClick={() => onOpenCase(id)}>
            {id}
          </button>
        ))}
      </div>
      <dl className="alert-body">
        <dt>Evidence</dt>
        <dd>
          <ul>
            {evidence.map((e, i) => (
              <li key={i}>
                {e.eventId && <span className="mono ev-id">{e.eventId}</span>} {e.text}
              </li>
            ))}
            {compact && alert.evidence.length > evidence.length && <li className="muted">+{alert.evidence.length - evidence.length} more in the case view</li>}
          </ul>
        </dd>
        <dt>Why flagged</dt>
        <dd>{alert.why}</dd>
        <dt>Suggested check</dt>
        <dd className="alert-check">{alert.suggestedCheck}</dd>
      </dl>
    </article>
  );
}
