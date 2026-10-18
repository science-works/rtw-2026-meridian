// Top-right corner instrument: "Next handoffs" — the next estimated handoffs to the pathologist.
// Reads only the computed estimates (status "estimated"); never a reporting time.
import type { CaseSummary } from "../../../shared/types";
import { parseSimTime } from "../../../shared/clock";
import { shortTime } from "../caseLine";
import { Corner } from "./Corner";
import type { CornerProps } from "./types";

/** Upcoming estimated handoffs, earliest first (ties by case ID). Ready/unknown cases are excluded. */
export function nextMilestones(cases: CaseSummary[], n = 3): { caseId: string; at: string }[] {
  return cases
    .filter((c) => c.estimate?.status === "estimated" && !!c.estimate.readyAt)
    .map((c) => ({ caseId: c.caseId, at: c.estimate.readyAt!, t: parseSimTime(c.estimate.readyAt!) }))
    .sort((a, b) => a.t - b.t || (a.caseId < b.caseId ? -1 : a.caseId > b.caseId ? 1 : 0))
    .slice(0, Math.max(0, n))
    .map(({ caseId, at }) => ({ caseId, at }));
}

function ClockSlideArt() {
  return (
    <svg viewBox="0 0 56 56" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {/* glass slide with a frosted label end */}
      <rect x="4" y="26" width="40" height="16" rx="2" />
      <line x1="14" y1="26" x2="14" y2="42" />
      <line x1="7" y1="31" x2="11" y2="31" />
      <line x1="7" y1="35" x2="11" y2="35" />
      {/* tissue section on the slide */}
      <path d="M22 34c1.5-3 5-3.5 7-2s4 1 5 3" />
      {/* clock face overlapping the slide's right end */}
      <circle cx="40" cy="20" r="11" />
      <line x1="40" y1="20" x2="40" y2="13" />
      <line x1="40" y1="20" x2="45" y2="23" />
      <line x1="40" y1="10" x2="40" y2="11" />
      <line x1="50" y1="20" x2="49" y2="20" />
    </svg>
  );
}

export function TopRight(props: CornerProps) {
  const rows = nextMilestones(props.cases, 3);
  const first = rows[0];
  return (
    <Corner
      to={first ? `/case/${first.caseId}` : "/section/all"}
      title="Next handoffs"
      testId="corner-top-right"
      label="Next estimated handoffs to the pathologist. Opens the first case."
      art={<ClockSlideArt />}
    >
      {rows.length === 0 ? (
        <span className="corner-sub">No estimated handoffs</span>
      ) : (
        <span style={{ display: "grid", gap: 0 }}>
          {rows.map((r) => (
            <span key={r.caseId} style={{ fontSize: 14, lineHeight: 1.2, whiteSpace: "nowrap", color: "var(--ink)" }}>
              <span className="corner-mono">{r.caseId}</span> <span className="corner-mono">~{shortTime(r.at)}</span>
            </span>
          ))}
        </span>
      )}
    </Corner>
  );
}
