// Bottom-right corner instrument: "Handed off" — cases ready for pathologist handoff (lab handoff only).
import type { CaseSummary } from "../../../shared/types";
import { parseSimTime } from "../../../shared/clock";
import { shortTime } from "../caseLine";
import { Corner } from "./Corner";
import type { CornerProps } from "./types";

const READY_STAGE = "Ready for pathologist handoff";

/** Count of cases at the handoff stage, and the most recent recorded ready time among them. */
export function handoffReadout(cases: CaseSummary[]): { count: number; last: { caseId: string; at: string } | null } {
  const ready = cases.filter((c) => c.stage === READY_STAGE);
  let last: { caseId: string; at: string; t: number } | null = null;
  for (const c of ready) {
    const at = c.estimate?.status === "ready" ? c.estimate.readyAt : undefined;
    if (!at) continue;
    const t = parseSimTime(at);
    if (!last || t > last.t || (t === last.t && c.caseId > last.caseId)) last = { caseId: c.caseId, at, t };
  }
  return { count: ready.length, last: last ? { caseId: last.caseId, at: last.at } : null };
}

function SlideMailerArt({ motion }: { motion: boolean }) {
  return (
    <svg viewBox="0 0 56 56" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {motion && (
        <style>{`@keyframes br-slide-out{from{transform:translateX(-4px);opacity:0}to{transform:none;opacity:1}}.br-out{animation:br-slide-out 700ms ease-out 1 both}`}</style>
      )}
      {/* open slide mailer: tray with lid folded back */}
      <path d="M6 24 L6 46 Q6 48 8 48 L34 48 Q36 48 36 46 L36 24" />
      <path d="M6 24 L36 24" />
      <path d="M6 24 L12 14 L42 14 L36 24" />
      {/* three slides standing in the tray, label ends at the top */}
      <rect x="11" y="20" width="5" height="24" rx="1" />
      <rect x="18.5" y="20" width="5" height="24" rx="1" />
      <rect x="26" y="20" width="5" height="24" rx="1" />
      <path d="M11 25 L16 25 M18.5 25 L23.5 25 M26 25 L31 25" />
      {/* small arrow out: handed on */}
      <g className={motion ? "br-out" : undefined}>
        <path d="M40 36 L51 36" />
        <path d="M47 32 L51 36 L47 40" />
      </g>
    </svg>
  );
}

export function BottomRight(props: CornerProps) {
  const { count, last } = handoffReadout(props.cases);
  return (
    <Corner
      to="/section/emitted"
      title="Handed off"
      testId="corner-bottom-right"
      label="Cases ready for pathologist handoff. Opens the list."
      art={<SlideMailerArt motion={props.motion} />}
    >
      {/* "ready for the pathologist" does not fit one 16px line in ~160px, so the short form is used. */}
      <span className="corner-value" style={{ whiteSpace: "nowrap" }}>
        <span className="corner-mono">{count}</span> handed off
      </span>
      <span className="corner-sub">
        {last ? (
          <>
            last <span className="corner-mono">{last.caseId}</span> · {shortTime(last.at)}
          </>
        ) : (
          "none yet"
        )}
      </span>
    </Corner>
  );
}
