import type { Alert } from "../../../shared/types";
import { navigate, paths } from "../router";

export const KIND_LABEL: Record<Alert["kind"], string> = {
  outstanding_block: "Outstanding block",
  protocol_mismatch: "Levels mismatch",
  basket_failure: "H&E basket failure",
  scan_gap: "Missing scan event",
};
export const STATE_LABEL: Record<Alert["state"], string> = { new: "New", check_needed: "Check needed", acknowledged: "Acknowledged — awaiting check", in_progress: "In progress", resolved: "Resolved" };

function Rows({ alerts }: { alerts: Alert[] }) {
  return (
    <table className="mini incidents-table">
      <thead>
        <tr>
          <th />
          <th>What</th>
          <th>Where</th>
          <th>When</th>
          <th>Status</th>
          <th>Affected cases</th>
        </tr>
      </thead>
      <tbody>
        {alerts.map((a) => (
          <tr
            key={a.id}
            tabIndex={0}
            onDoubleClick={() => navigate(paths.incident(a.id))}
            onKeyDown={(e) => e.key === "Enter" && navigate(paths.incident(a.id))}
            title="Double-click or press Enter to open"
          >
            <td>
              <span className="flag" aria-hidden>
                !
              </span>
            </td>
            <td>
              <b>{KIND_LABEL[a.kind]}</b>
              <br />
              {a.what}
            </td>
            <td>{a.where}</td>
            <td className="mono">{a.raisedAt}</td>
            <td>
              <span className={`alert-state ${a.state}`}>{STATE_LABEL[a.state]}</span>
            </td>
            <td className="mono">{a.caseIds.length}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Incidents list: Open and Closed (double-click or Enter opens one). */
export function IncidentsPage({ alerts }: { alerts: Alert[] }) {
  const open = alerts.filter((a) => a.state !== "resolved").sort((a, b) => b.raisedAt.localeCompare(a.raisedAt));
  const closed = alerts.filter((a) => a.state === "resolved");
  return (
    <section className="page">
      <header className="page-head">
        <h1>Incidents</h1>
        <p className="page-sub">Flagged by deterministic rules from recorded events. Staff decide and record the action; acknowledging is not a fix.</p>
      </header>
      <section className="panel">
        <h2>Open ({open.length})</h2>
        {open.length ? <Rows alerts={open} /> : <p className="empty-state">No open incidents.</p>}
      </section>
      <section className="panel">
        <h2>Closed ({closed.length})</h2>
        {closed.length ? <Rows alerts={closed} /> : <p className="empty-state">No closed incidents in this simulated day.</p>}
      </section>
    </section>
  );
}
