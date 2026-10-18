import { useState } from "react";
import type { Alert, CaseSummary, StationCard } from "../../../shared/types";
import { BasketGrid } from "../flow/LabFlow";
import { Link, navigate, paths } from "../router";
import { CaseLine } from "../caseLine";
import { KIND_LABEL, statusText } from "./IncidentsPage";
import { fxActive } from "../fxFlags";
import { flyTo, settle } from "../motionPack";
import { vizOn } from "../vizFlags";
import { BlastRadius } from "../viz/BlastRadius";

const STEPS = ["Run failed", "Team notified", "Acknowledged", "Troubleshooting started", "Basket reloaded", "Repeat H&E run started"];

async function acknowledge(id: string): Promise<string | null> {
  const r = await fetch(`/api/alerts/${encodeURIComponent(id)}/acknowledge`, { method: "POST" });
  return r.ok ? null : ((await r.json()) as { error: string }).error;
}

/** Incident detail: what, where, when, the action timeline, Acknowledge, affected cases. */
export function IncidentPage({ id, alerts, cases, stations }: { id: string; alerts: Alert[]; cases: CaseSummary[]; stations: StationCard[] }) {
  const a = alerts.find((x) => x.id === id);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  if (!a) {
    return (
      <section className="page">
        <h1>Incident</h1>
        <p className="empty-state">This incident is not in the current state (it may not have been replayed yet, or the demo was reset).</p>
        <Link to={paths.incidents}>All incidents</Link>
      </section>
    );
  }
  const affected = cases.filter((c) => a.caseIds.includes(c.caseId));
  const isBasket = a.kind === "basket_failure";
  const stainer = stations.find((s) => s.id === "stainer-1");
  const recorded = new Set(a.history.map((h) => h.label));
  const stage = { protocol_mismatch: "microtomy", basket_failure: "stain", outstanding_block: "reception", scan_gap: "scan" }[a.kind];
  return (
    <section className="page" data-stage={stage}>
      <header className="page-head">
        <div>
          <p className="page-kicker">
            <span className="flag" aria-hidden>
              !
            </span>{" "}
            {KIND_LABEL[a.kind]}
          </p>
          <h1>{a.what}</h1>
          <p className="page-sub">
            {a.where} · raised <span className="mono">{a.raisedAt}</span>
          </p>
        </div>
        <div className="incident-actions">
          <span className={`alert-state big ${a.state}`}>{statusText(a)}</span>
          {(a.state === "new" || a.state === "check_needed") && (
            <button
              className="btn-trigger btn-ack"
              disabled={busy}
              onClick={async (e) => {
                if (fxActive(2)) {
                  const head = e.currentTarget.closest(".page-head");
                  settle(head?.querySelector(".page-kicker .flag") ?? null);
                  flyTo(head?.querySelector("h1") ?? null, document.querySelector('.tab[href="/incidents"]'), a.what);
                }
                setBusy(true);
                setMsg(await acknowledge(a.id));
                setBusy(false);
              }}
            >
              Acknowledge
            </button>
          )}
          {msg && <p className="alert-text small">{msg}</p>}
        </div>
      </header>

      {isBasket && vizOn(5) && <BlastRadius alert={a} cases={cases} />}

      <div className="case-grid">
        <div className="case-main">
          {isBasket ? (
            <section className="panel">
              <h2>Action timeline</h2>
              <ol className="steps">
                {STEPS.map((s) => {
                  const h = a.history.find((x) => x.label === s);
                  return (
                    <li key={s} className={h ? "done" : "todo"}>
                      <span className="step-dot" aria-hidden />
                      <span className="step-label">{s}</span>
                      <span className="mono muted">{h ? `${h.at.slice(-5)} · ${h.eventId}` : "not yet recorded"}</span>
                    </li>
                  );
                })}
                <li className={recorded.has("Repeat run complete") ? "done" : "todo"}>
                  <span className="step-dot" aria-hidden />
                  <span className="step-label">{recorded.has("Repeat run complete") ? "Resolved" : "Open"}</span>
                  <span className="muted">{recorded.has("Repeat run complete") ? "completion recorded" : "stays open until the repeat run and follow-up check are recorded"}</span>
                </li>
              </ol>
            </section>
          ) : (
            <section className="panel">
              <h2>History</h2>
              <ol className="steps">
                {a.history.map((h) => (
                  <li key={h.at + h.label} className="done">
                    <span className="step-dot" aria-hidden />
                    <span className="step-label">{h.label}</span>
                    <span className="mono muted">
                      {h.at}
                      {h.eventId ? ` · ${h.eventId}` : ""}
                    </span>
                  </li>
                ))}
              </ol>
              <p className="muted small">Acknowledging records that the presenter has seen it (this demo session, not a lab event). It stays open until a check is recorded.</p>
            </section>
          )}

          <section className="panel">
            <h2>Why it is flagged</h2>
            <p>{a.why}</p>
            <h3>Suggested check</h3>
            <p className="alert-check">{a.suggestedCheck}</p>
            <h3>Evidence</h3>
            <ul className="evidence">
              {a.evidence.map((e, i) => (
                <li key={i}>
                  {e.eventId && <span className="mono ev-id">{e.eventId}</span>} {e.text}
                </li>
              ))}
            </ul>
          </section>
        </div>

        <aside className="case-side">
          {isBasket && stainer && (
            <section className="panel">
              <h2>H&E auto-stainer 1</h2>
              <BasketGrid card={stainer} highlight={a.id.replace("basket_failure:", "")} onOpenCase={(cid) => navigate(paths.case(cid))} />
            </section>
          )}
          <section className="panel">
            <h2>
              Affected: {a.slideIds?.length ? `${a.slideIds.length} slide${a.slideIds.length === 1 ? "" : "s"} · ` : ""}
              {affected.length} case{affected.length === 1 ? "" : "s"}
            </h2>
            <ul className="case-rows">
              {affected.map((c) => (
                <li key={c.caseId}>
                  <button className="case-row" onClick={() => navigate(paths.case(c.caseId))}>
                    <CaseLine c={c} />
                    <span className="emitted">{c.stage === "Ready for pathologist handoff" ? "Emitted by the lab" : "Not yet emitted"}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>
    </section>
  );
}
