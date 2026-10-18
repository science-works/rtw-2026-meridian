// Viz 3 · Where this case sits: for each stage this case has passed or is in, its time there against
// the typical spread across the simulated cases (band 25th–75th, tick median, whiskers 10th–90th).
import { useEffect, useState } from "react";
import { fmtMinutes, type Dwell, type DwellStats } from "../../../shared/insights";

const STAGE_KEY: Record<string, string> = {
  Received: "reception",
  "Cut-up": "reception",
  Decalcification: "decal",
  Processing: "processor",
  Embedding: "embedding",
  Microtomy: "microtomy",
  "H&E staining": "stain",
  Scanning: "scan",
  IQC: "iqc",
};

export function CaseSits({ caseId, version }: { caseId: string; version: number }) {
  const [data, setData] = useState<{ stats: DwellStats[]; cases: number; case: Dwell[] | null } | null>(null);
  useEffect(() => {
    let live = true;
    fetch(`/api/insights/dwell?case=${encodeURIComponent(caseId)}`)
      .then((r) => r.json())
      .then((d) => live && setData(d));
    return () => {
      live = false;
    };
  }, [caseId, version]);
  if (!data?.case?.length) return null;
  const rows = data.case.map((d) => ({ d, s: data.stats.find((x) => x.stage === d.stage) })).filter((r): r is { d: Dwell; s: DwellStats } => !!r.s);
  if (!rows.length) return null;
  return (
    <section className="panel case-sits" aria-label="Where this case sits">
      <h2>Where this case sits</h2>
      <ul className="cs-rows">
        {rows.map(({ d, s }) => {
          const max = Math.max(s.p90, d.minutes) * 1.08 || 1;
          const x = (m: number) => `${(m / max) * 100}%`;
          const beyond = d.minutes > s.p90;
          return (
            <li key={d.stage} className="cs-row" data-stage={STAGE_KEY[d.stage]}>
              <p className="cs-label">
                <strong>{d.stage}</strong> · this case <span className="mono">{fmtMinutes(d.minutes)}</span>
                {d.inProgress && " so far"} · typical{" "}
                <span className="mono">
                  {fmtMinutes(s.p25)}–{fmtMinutes(s.p75)}
                </span>
                <span className="muted"> · n = {s.n}</span>
              </p>
              <svg className="cs-bar" width="100%" height="26" aria-hidden>
                <line x1={x(s.p10)} x2={x(s.p90)} y1="13" y2="13" className="cs-whisker" />
                <line x1={x(s.p10)} x2={x(s.p10)} y1="7" y2="19" className="cs-whisker" />
                <line x1={x(s.p90)} x2={x(s.p90)} y1="7" y2="19" className="cs-whisker" />
                <rect x={x(s.p25)} width={`${((s.p75 - s.p25) / max) * 100}%`} y="6" height="14" rx="4" className="cs-band" />
                <line x1={x(s.p50)} x2={x(s.p50)} y1="4" y2="22" className="cs-median" />
                <circle cx={x(d.minutes)} cy="13" r="7" className={`cs-dot${beyond ? " beyond" : ""}`} />
              </svg>
            </li>
          );
        })}
      </ul>
      <p className="muted cs-note">
        Typical = across the {data.cases} simulated cases. Band: middle half · tick: median · whiskers: 10th–90th percentile · dot: this case
        {rows.some((r) => r.d.minutes > r.s.p90) && " (ringed when beyond the 90th percentile)"}.
      </p>
    </section>
  );
}
