import type { Alert, CaseDetail } from "../../../shared/types";
import { useFxFlag } from "../fxFlags";

// "Flight tracker for tissue": where the case has been, where it is, what is next,
// and the handoff estimate (or why there is none). Every value comes from the API.

interface Step {
  key: string;
  label: string;
  stages: string[]; // recorded stage names (case or event level) that belong to this step
}

const STEPS: Step[] = [
  { key: "received", label: "Received", stages: ["Received/booked"] },
  { key: "cutup", label: "Cut-up", stages: ["Waiting for dissection/cut-up", "Dissection/cut-up"] },
  { key: "decal", label: "Decalc.", stages: ["Decalcification"] },
  { key: "processor", label: "Processor", stages: ["Awaiting processor or processing"] },
  { key: "embedding", label: "Embedding", stages: ["Embedding"] },
  { key: "microtomy", label: "Microtomy", stages: ["Microtomy"] },
  { key: "stain", label: "H&E", stages: ["H&E staining"] },
  { key: "scan", label: "Scanning", stages: ["Scanning"] },
  { key: "iqc", label: "IQC", stages: ["IQC"] },
  { key: "ready", label: "Ready", stages: ["Ready for pathologist handoff"] },
];

/** Journey step → "Stain spectrum" stage key. */
const JOURNEY_STAGE: Record<string, string> = { received: "reception", cutup: "reception", ready: "handoff" };

export function stepIndex(steps: Step[], stage: string | null): number {
  return stage === null ? -1 : steps.findIndex((s) => s.stages.includes(stage));
}

function range(ids: string[]): string {
  const s = [...ids].sort();
  const consecutive = s.length > 2 && s.every((id, i) => i === 0 || (id.slice(1) === s[0].slice(1) && id.charCodeAt(0) === s[i - 1].charCodeAt(0) + 1));
  return consecutive ? `${s[0]}–${s.at(-1)}` : s.join(", ");
}

interface Props {
  detail: CaseDetail;
  alerts: Alert[];
}

export function JourneyBar({ detail, alerts }: Props) {
  const drawOn = useFxFlag(3);
  const usesDecal = detail.stage === "Decalcification" || detail.timeline.some((e) => e.stage === "Decalcification");
  const steps = STEPS.filter((s) => s.key !== "decal" || usesDecal);
  const current = stepIndex(steps, detail.stage);
  const reached = steps.map((s) => detail.timeline.find((e) => s.stages.includes(e.stage))?.at);
  const hold = alerts.some((a) => a.kind === "outstanding_block");
  const flagged = alerts.some((a) => a.kind !== "outstanding_block");

  // Blocks that have diverged get their own row (e.g. A1–E1 in the processor, F1 at cut-up).
  const groups = new Map<number, string[]>();
  for (const b of detail.blocks) {
    const i = stepIndex(steps, b.stage);
    groups.set(i, [...(groups.get(i) ?? []), b.blockId]);
  }
  const diverged = groups.size > 1;
  const lowest = Math.min(...groups.keys());
  const est = detail.estimate;

  return (
    <div className={`journey${drawOn ? " drawon" : ""}`} aria-label="Case journey" style={{ ["--n" as string]: steps.length }}>
      <ol className="journey-track" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}>
        {steps.map((s, i) => {
          const state = est.status === "ready" || i < current ? "done" : i === current ? (flagged ? "alert" : hold ? "hold" : "now") : "next";
          return (
            <li key={s.key} className={`j-step ${state}`} title={s.stages[0]} data-stage={JOURNEY_STAGE[s.key] ?? s.key} style={{ ["--i" as string]: i }}>
              <span className="j-dot" aria-hidden />
              <span className="j-label">{s.label}</span>
              <span className="j-time mono">{reached[i] ? reached[i]!.replace(/^Day (-?\d+) /, "D$1 ") : i <= current ? "—" : ""}</span>
            </li>
          );
        })}
      </ol>

      {diverged && (
        <div className="journey-blocks">
          {[...groups.entries()]
            .sort((a, b) => b[0] - a[0])
            .map(([i, ids]) => {
              const isHold = hold && i === lowest;
              return (
                <div key={i} className="jb-row" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}>
                  <span className={`jb-bar ${isHold ? "hold" : "ok"}`} style={{ gridColumn: `1 / ${Math.max(i, 0) + 2}` }} aria-hidden />
                  <span className={`jb-text ${isHold ? "hold" : ""}`} style={{ gridColumn: `${Math.max(i, 0) + 2} / -1` }}>
                    <span className="mono">{range(ids)}</span> at {i >= 0 ? steps[i].label : "an unknown stage"}
                    {isHold && " · outstanding"}
                  </span>
                </div>
              );
            })}
        </div>
      )}

      <div className={`journey-dest ${est.status}`}>
        <span className="jd-label">Pathologist handoff</span>
        {est.status === "ready" && <span className="jd-value">Ready since {est.readyAt}</span>}
        {est.status === "estimated" && <span className="jd-value">Ready for pathologist ~<span className="mono">{est.readyAt}</span></span>}
        {est.status === "unknown" && <span className="jd-value">Unknown (reason below)</span>}
      </div>
    </div>
  );
}
