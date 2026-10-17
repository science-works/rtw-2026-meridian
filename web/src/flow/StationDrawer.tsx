import { useEffect } from "react";
import type { CaseSummary, StationCard } from "../../../shared/types";

interface Props {
  card: StationCard;
  cases: CaseSummary[];
  onClose: () => void;
  onOpenCase: (id: string) => void;
}

/** Click on a station: everything recorded inside it (spec Screen B, "a click opens a detail drawer/list"). */
export function StationDrawer({ card, cases, onClose, onOpenCase }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  const rows = cases.filter((c) => card.caseIds.includes(c.caseId));
  return (
    <div className="drawer-scrim" onClick={onClose}>
      <aside className="drawer" role="dialog" aria-label={card.label} onClick={(e) => e.stopPropagation()}>
        <header className="drawer-head">
          <div>
            <h2>{card.label}</h2>
            <p className="drawer-sub">{card.state}</p>
          </div>
          <button className="btn-quiet" onClick={onClose}>
            Close ✕
          </button>
        </header>
        <div className="drawer-body">
          <section>
            <p>
              <b>{card.caseIds.length}</b> cases{card.blocks ? ` · ${card.blocks} blocks` : ""}
              {card.slides ? ` · ${card.slides} slides` : ""}
              {card.load ? ` · ${card.load}` : ""}
            </p>
            {card.items?.map((i) => (
              <p key={i} className="mono">
                {i}
              </p>
            ))}
            {card.nextMilestone && (
              <p className="muted">
                Next expected: {card.nextMilestone.text}
                {card.nextMilestone.rule ? ` (${card.nextMilestone.rule})` : ""}
              </p>
            )}
          </section>
          {card.baskets && (
            <section>
              <h3>Baskets</h3>
              <table className="mini">
                <thead>
                  <tr>
                    <th>Box / basket</th>
                    <th>Basket ID</th>
                    <th>Slides</th>
                    <th>Cases</th>
                    <th>State</th>
                  </tr>
                </thead>
                <tbody>
                  {card.baskets
                    .filter((b) => b.basketId)
                    .map((b) => (
                      <tr key={`${b.box}-${b.basket}`}>
                        <td>
                          Box {b.box} / Basket {b.basket}
                        </td>
                        <td className="mono">{b.basketId}</td>
                        <td className="mono">{b.slides}</td>
                        <td className="wrap mono">{b.caseIds.join(", ")}</td>
                        <td>{b.state}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </section>
          )}
          {card.initials && card.initials.length > 0 && (
            <section>
              <h3>Embedding record (fictional initials; traceability only, never ranked)</h3>
              <p className="muted small">
                {card.initials.length} recorded embedding events · initials {[...new Set(card.initials.map((i) => i.initials))].join(", ")} · latest {card.initials.at(-1)!.at}
              </p>
            </section>
          )}
          <section>
            <h3>Cases</h3>
            <table className="mini">
              <thead>
                <tr>
                  <th>Case</th>
                  <th>Recorded stage</th>
                  <th>Priority</th>
                  <th>Handoff estimate</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => (
                  <tr key={c.caseId} onClick={() => onOpenCase(c.caseId)}>
                    <td className="mono case-id">{c.caseId}</td>
                    <td>{c.stage}</td>
                    <td>{c.priority}</td>
                    <td className="mono">{c.estimate.status === "ready" ? "Ready" : (c.estimate.readyAt ?? "Unknown")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>
      </aside>
    </div>
  );
}
