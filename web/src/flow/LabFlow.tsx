import { motion } from "motion/react";
import { useRef, useState, type CSSProperties } from "react";
import type { Alert, CaseSummary, StationCard } from "../../../shared/types";
import { Count } from "../components/Flow";
import { SendIcon, TrayIcon } from "../theme/icons";

interface Props {
  stations: StationCard[];
  cases: CaseSummary[];
  alerts: Alert[];
  onOpenStation: (id: string) => void;
  onOpenCase: (id: string) => void;
}

const ZONES = ["Reception / dissection", "Decalcification holding", "Processors", "Embedding", "Microtomy", "H&E", "Scanning", "IQC", "Pathologist handoff"];

/** 2–4 visible chips, then "+N more" (spec Screen B). Urgent and flagged cases first. */
function chipsFor(card: StationCard, cases: Map<string, CaseSummary>, flagged: Set<string>, max: number) {
  const sorted = [...card.caseIds].sort(
    (a, b) => Number(flagged.has(b)) - Number(flagged.has(a)) || Number(cases.get(b)?.priority === "Urgent") - Number(cases.get(a)?.priority === "Urgent") || Number(cases.get(b)?.isDemo) - Number(cases.get(a)?.isDemo) || a.localeCompare(b),
  );
  return { shown: sorted.slice(0, max), more: Math.max(sorted.length - max, 0) };
}

const POP_W = 320;
const POP_H = 360;

/** Fixed-position popover beside the card, clamped to the viewport so it is never clipped. */
function popoverStyle(anchor: DOMRect): CSSProperties {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const left = anchor.right + 8 + POP_W <= vw - 8 ? anchor.right + 8 : Math.max(8, anchor.left - 8 - POP_W);
  const top = Math.min(Math.max(8, anchor.top), Math.max(8, vh - POP_H - 8));
  return { position: "fixed", left, top, width: POP_W, maxHeight: vh - 16, overflow: "auto" };
}

function Popover({ card, anchor }: { card: StationCard; anchor: DOMRect }) {
  return (
    <div className="popover" role="tooltip" style={popoverStyle(anchor)}>
      <div className="pop-title">{card.label}</div>
      <div className="pop-state">{card.state}</div>
      <dl>
        <dt>Contents</dt>
        <dd>
          {card.caseIds.length} case{card.caseIds.length === 1 ? "" : "s"}
          {card.blocks ? ` · ${card.blocks} blocks` : ""}
          {card.slides ? ` · ${card.slides} slides` : ""}
          {card.items?.length ? ` · ${card.items.join("; ")}` : ""}
        </dd>
        {card.load && (
          <>
            <dt>Load / capacity</dt>
            <dd>{card.load}</dd>
          </>
        )}
        <dt>Latest event</dt>
        <dd>{card.latestEvent ? `${card.latestEvent.at} · ${card.latestEvent.text}` : "None recorded here"}</dd>
        {card.nextMilestone && (
          <>
            <dt>Next expected milestone</dt>
            <dd>
              {card.nextMilestone.text}
              {card.nextMilestone.rule && <span className="pop-rule"> ({card.nextMilestone.rule})</span>}
            </dd>
          </>
        )}
        {card.initials && card.initials.length > 0 && (
          <>
            <dt>Recorded by (fictional initials; traceability only)</dt>
            <dd>
              {[...new Set(card.initials.map((i) => i.initials))].join(", ")} · latest {card.initials.at(-1)!.at.slice(-5)}
            </dd>
          </>
        )}
        {card.handoff && (
          <>
            <dt>Handoff</dt>
            <dd>
              {card.handoff.digital}
              <br />
              {card.handoff.physical}
            </dd>
          </>
        )}
      </dl>
      <div className="pop-hint">Click for the full list</div>
    </div>
  );
}

function Card({ card, cases, flagged, compact, onOpenStation, onOpenCase }: { card: StationCard; cases: Map<string, CaseSummary>; flagged: Set<string>; compact?: boolean; onOpenStation: (id: string) => void; onOpenCase: (id: string) => void }) {
  const [hover, setHover] = useState<DOMRect | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const show = () => ref.current && setHover(ref.current.getBoundingClientRect());
  const { shown, more } = chipsFor(card, cases, flagged, compact ? 2 : 4);
  const hasAttention = card.caseIds.some((id) => flagged.has(id));
  return (
    <div
      className={`st-card kind-${card.kind} ${compact ? "compact" : ""} ${hasAttention ? "attention" : ""}`}
      ref={ref}
      onMouseEnter={show}
      onMouseLeave={() => setHover(null)}
      onFocus={show}
      onBlur={() => setHover(null)}
      onClick={() => onOpenStation(card.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onOpenStation(card.id)}
      data-station={card.id}
    >
      <div className="st-head">
        <span className="st-label">{card.label}</span>
        <Count className="st-count mono" value={card.caseIds.length} />
      </div>
      {!compact && <div className="st-state">{card.state}</div>}
      {card.items?.map((i) => (
        <div key={i} className="st-item mono">
          {i}
        </div>
      ))}
      <div className="st-chips">
        {shown.map((id) => (
          <motion.button
            layout
            layoutId={`chip-${id}-${card.id}`}
            key={id}
            className={`chip mono ${flagged.has(id) ? "chip-attn" : ""} ${cases.get(id)?.priority === "Urgent" ? "chip-urgent-case" : ""}`}
            onClick={(e) => {
              e.stopPropagation();
              onOpenCase(id);
            }}
          >
            {flagged.has(id) && <span aria-label="open attention item">! </span>}
            {id}
          </motion.button>
        ))}
        {more > 0 && <span className="st-more">+{more} more</span>}
      </div>
      {card.baskets && <BasketGrid card={card} onOpenCase={onOpenCase} />}
      {card.handoff && (
        <div className="st-handoff">
          <span className="icon-line"><TrayIcon /> Physical tray: not recorded separately</span>
          <span className="icon-line"><SendIcon /> Digital send: {card.handoff.digital.replace(/^Digital send recorded for /, "")}</span>
        </div>
      )}
      {hover && <Popover card={card} anchor={hover} />}
    </div>
  );
}

const toneOf = (state: string, loaded: boolean) =>
  /failed/i.test(state) ? "failed" : /Acknowledged/.test(state) ? "ack" : /progress|Troubleshooting|reloaded/i.test(state) ? "progress" : loaded ? "loaded" : "empty";

/** 3 boxes × 3 baskets (20 slides each); occupied baskets get a one-line detail with their state. */
export function BasketGrid({ card, onOpenCase, highlight }: { card: StationCard; onOpenCase: (id: string) => void; highlight?: string }) {
  const occupied = card.baskets!.filter((b) => b.basketId);
  return (
    <div className="basket-wrap">
      <div className="baskets" aria-label="3 boxes × 3 baskets">
        <span />
        {[1, 2, 3].map((box) => (
          <span key={box} className="box-label">
            Box {box}
          </span>
        ))}
        {[1, 2, 3].map((basket) => (
          <div key={basket} className="basket-row">
            <span className="box-label">B{basket}</span>
            {[1, 2, 3].map((box) => {
              const b = card.baskets!.find((x) => x.box === box && x.basket === basket)!;
              return (
                <motion.span
                  key={box}
                  layout
                  className={`basket ${toneOf(b.state, !!b.basketId)} ${highlight && b.basketId === highlight ? "highlight" : ""}`}
                  title={b.basketId ? `Box ${box} / Basket ${basket}: ${b.basketId}, ${b.slides} slides, ${b.caseIds.length} cases. ${b.state}` : `Box ${box} / Basket ${basket}: empty (none recorded)`}
                >
                  {b.basketId ? `${b.slides}` : ""}
                </motion.span>
              );
            })}
          </div>
        ))}
      </div>
      {occupied.map((b) => (
        <div key={b.basketId} className={`basket-detail ${toneOf(b.state, true)} ${highlight && b.basketId === highlight ? "highlight" : ""}`}>
          <span>
            Box {b.box} / Basket {b.basket} · <span className="mono">{b.basketId}</span> · {b.slides} slides · {b.caseIds.length} cases
          </span>
          <b className="basket-state">{b.state}</b>
          <button
            className="chip mono"
            onClick={(e) => {
              e.stopPropagation();
              onOpenCase(b.caseIds[0]);
            }}
          >
            {b.caseIds[0]}–{b.caseIds.at(-1)!.slice(-2)}
          </button>
        </div>
      ))}
    </div>
  );
}

const ROWS: { zones: string[]; cols: string }[] = [
  { zones: ["Reception / dissection", "Decalcification holding", "Processors", "Embedding"], cols: "1fr 0.9fr 1.6fr 1.2fr" },
  { zones: ["Microtomy", "H&E", "Scanning", "IQC", "Pathologist handoff"], cols: "1.5fr 1.6fr 1.1fr 0.8fr 0.9fr" },
];

const GRID: Record<string, number> = { Processors: 2, Microtomy: 3, Scanning: 2, Embedding: 2 };

/** The lab-flow map (spec Screen B), from /api/stations. Tokens move only when events are appended. */
export function LabFlow({ stations, cases, alerts, onOpenStation, onOpenCase }: Props) {
  const byId = new Map(cases.map((c) => [c.caseId, c]));
  const flagged = new Set(alerts.filter((a) => a.state !== "resolved").flatMap((a) => a.caseIds));
  return (
    <section className="labflow" aria-label="Lab-flow map">
      {ROWS.map((row, r) => (
        <div key={r} className={`flow-row row-${r}`} style={{ gridTemplateColumns: row.cols }}>
          {row.zones.map((zone, i) => {
            const n = ZONES.indexOf(zone);
            const cards = stations.filter((s) => s.zone === zone);
            const total = new Set(cards.flatMap((c) => c.caseIds)).size;
            const cols = GRID[zone] ?? 1;
            const last = i === row.zones.length - 1;
            return (
              <div key={zone} className={`zone ${zone === "Decalcification holding" ? "conditional" : ""}`}>
                <div className="zone-head">
                  <span className="zone-step mono">{String(n + 1).padStart(2, "0")}</span>
                  <span className="zone-name">{zone === "Decalcification holding" ? "Decalcification (holding, when needed)" : zone}</span>
                  <Count className="zone-total mono" value={total} />
                </div>
                <div className="zone-cards" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
                  {cards.map((c) => (
                    <Card key={c.id} card={c} cases={byId} flagged={flagged} compact={cols > 1 && c.kind !== "queue"} onOpenStation={onOpenStation} onOpenCase={onOpenCase} />
                  ))}
                </div>
                {!last && <span className="zone-arrow" aria-hidden>→</span>}
                {last && r === 0 && <span className="zone-arrow turn" aria-hidden>↓ to microtomy</span>}
              </div>
            );
          })}
        </div>
      ))}
    </section>
  );
}
