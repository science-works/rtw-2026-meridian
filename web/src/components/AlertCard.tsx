import type { Alert } from "../../../shared/types";
import { useFx } from "../fx";

const KIND_LABEL: Record<Alert["kind"], string> = {
  outstanding_block: "Outstanding block",
  protocol_mismatch: "Levels mismatch",
  basket_failure: "H&E basket failure",
  scan_gap: "Missing scan event",
};

const STATE_LABEL: Record<Alert["state"], string> = {
  new: "New",
  acknowledged: "Acknowledged",
  in_progress: "In progress",
  resolved: "Resolved",
};

interface Props {
  alert: Alert;
  onOpenCase: (id: string) => void;
  pulse?: boolean;
  /** Compact: marker, what, cases and state; evidence on click. */
  compact?: boolean;
  expanded?: boolean;
  onToggle?: () => void;
}

/**
 * One uniform "!" marker per open issue (no severity ranking). New markers bounce gently
 * until acknowledged; the card stays open until a completion/check event is recorded.
 * Every alert shows what, the evidence, why it is flagged, and the suggested staff check.
 */
export function AlertCard({ alert, onOpenCase, pulse, compact, expanded, onToggle }: Props) {
  const fx = useFx();
  const full = !compact || expanded;
  const evidence = alert.evidence;
  const showHistory = full && alert.history.length > 1;
  return (
    <article
      className={`alert-card ${alert.state} ${pulse ? "pulse" : ""} ${compact ? "compact" : ""}`}
      aria-label={`${KIND_LABEL[alert.kind]}: ${STATE_LABEL[alert.state]}`}
      aria-expanded={compact ? !!expanded : undefined}
      onClick={compact ? onToggle : undefined}
    >
      <header className="alert-head">
        <span className={`alert-marker ${alert.state === "new" && fx.on ? "bounce" : ""}`} aria-hidden>
          !
        </span>
        <span className="alert-kind">{KIND_LABEL[alert.kind]}</span>
        <span className="mono alert-time">{alert.raisedAt}</span>
        <span className={`alert-state ${alert.state}`}>{STATE_LABEL[alert.state]}</span>
        {compact && <span className="alert-more" aria-hidden>{expanded ? "▴" : "▾"}</span>}
      </header>
      <h3 className="alert-what">{alert.what}</h3>
      {alert.stateDetail && <p className="alert-detail">{alert.stateDetail}</p>}
      <div className="alert-cases">
        {alert.caseIds.map((id) => (
          <button
            key={id}
            className="chip mono"
            onClick={(e) => {
              e.stopPropagation();
              onOpenCase(id);
            }}
          >
            {id}
          </button>
        ))}
      </div>
      {showHistory && (
        <ol className="alert-history" aria-label="History">
          {alert.history.map((h) => (
            <li key={`${h.at}-${h.label}`}>
              <span className="mono">{h.at.slice(-5)}</span> <b>{h.label}</b>
            </li>
          ))}
        </ol>
      )}
      {full && (
      <dl className="alert-body">
        <dt>Evidence</dt>
        <dd>
          <ul>
            {evidence.map((e, i) => (
              <li key={i}>
                {e.eventId && <span className="mono ev-id">{e.eventId}</span>} {e.text}
              </li>
            ))}
          </ul>
        </dd>
        <dt>Why flagged</dt>
        <dd>{alert.why}</dd>
        <dt>Suggested check</dt>
        <dd className="alert-check">{alert.suggestedCheck}</dd>
      </dl>
      )}
    </article>
  );
}
