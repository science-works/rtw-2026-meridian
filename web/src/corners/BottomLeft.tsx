// Bottom-left corner instrument: "Stainer" — H&E auto-stainer status from the basket-failure alert.
// Neutral ink/muted/progress only: the warm attention colour and red are reserved elsewhere.
import type { Alert } from "../../../shared/types";
import { paths } from "../router";
import { Corner } from "./Corner";
import type { CornerProps } from "./types";

const PHRASE = "Stain run completes";

/** Pure readout for the stainer corner, from the recorded alerts only. */
export function stainerReadout(alerts: Alert[]): { value: string; sub: string } {
  const alert = alerts.find((a) => a.kind === "basket_failure");
  if (!alert || alert.state === "resolved") return { value: "No stainer incident", sub: "H&E auto-stainer 1" };
  const detail = alert.stateDetail ?? "";
  let value = "Re-staining";
  if (detail.includes(PHRASE)) {
    const idx = detail.lastIndexOf("· ");
    const tail = idx >= 0 ? detail.slice(idx + 2).trim() : "";
    value = tail.includes(PHRASE) ? tail : detail.slice(detail.indexOf(PHRASE)).trim();
  }
  return { value, sub: `${alert.slideIds?.length ?? 0} slides · ${alert.caseIds.length} cases` };
}

function RackArt({ motion }: { motion: boolean }) {
  const slides = [17, 22.5, 28, 33.5, 39];
  return (
    <svg viewBox="0 0 56 56" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {/* rack handle */}
      <path d="M20 12 V7 H36 V12" />
      {/* rack frame */}
      <path d="M13 12 H43 M13 12 V40 M43 12 V40 M13 40 H43" />
      {/* slides standing in the rack */}
      {slides.map((x, i) => (
        <rect key={x} x={x - 1.5} y={15} width={3} height={22} rx={0.6}>
          {motion && (
            // Once, staggered, total ≤ 720 ms.
            <animate attributeName="opacity" values="0;0;1" keyTimes={`0;${((i * 0.08) / (0.4 + i * 0.08)).toFixed(3)};1`} dur={`${0.4 + i * 0.08}s`} begin="0s" fill="freeze" />
          )}
        </rect>
      ))}
      {/* staining dish */}
      <path d="M7 26 V46 Q7 49 10 49 H46 Q49 49 49 46 V26" />
      {/* liquid surface */}
      <path d="M8 30 Q12 28 16 30 T24 30 T32 30 T40 30 T48 30" strokeWidth={1.2} />
    </svg>
  );
}

export function BottomLeft(props: CornerProps) {
  const alert = props.alerts.find((a) => a.kind === "basket_failure");
  const { value, sub } = stainerReadout(props.alerts);
  const m = value.match(/^(.*?)(~?\d{1,2}:\d{2})$/);
  return (
    <Corner
      to={alert ? paths.incident(alert.id) : "/station/stainer-1"}
      title="Stainer"
      testId="corner-bottom-left"
      label="H&E auto-stainer status. Opens the stainer incident."
      art={<RackArt motion={props.motion} />}
    >
      {/* Three short lines to fit the corner: "Re-staining" / "completes ~11:35" (counts are on the incident page). */}
      <span className="corner-value">{m ? "Re-staining" : value}</span>
      <span className="corner-sub" title={sub}>
        {m ? (
          <>
            completes <span className="corner-mono">{m[2]}</span>
          </>
        ) : (
          sub
        )}
      </span>
    </Corner>
  );
}
