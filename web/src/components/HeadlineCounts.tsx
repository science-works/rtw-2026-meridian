import type { Overview } from "../../../shared/types";
import { Count } from "./Flow";

export type CaseScope = "all" | "demo" | "flagged" | "urgent" | "screening" | "backlog" | "today" | "ready";

interface Props {
  overview: Overview;
  scope: CaseScope;
  onScope: (s: CaseScope) => void;
}

/** Compact headline counts (spec Screen A). Every number comes from /api/overview; click → filtered list. */
export function HeadlineCounts({ overview: o, scope, onScope }: Props) {
  const tiles: { key: CaseScope; label: string; value: number; tone?: string }[] = [
    { key: "all", label: "Tracked cases", value: o.total },
    { key: "backlog", label: "Previous-day backlog", value: o.backlog },
    { key: "today", label: "Current-day workload", value: o.today },
    { key: "urgent", label: "Urgent", value: o.urgent },
    { key: "screening", label: "Screening-linked", value: o.screeningLinked },
    { key: "ready", label: "Ready for pathologist", value: o.ready, tone: "ready" },
    { key: "flagged", label: "Open attention items", value: o.openAttention, tone: "attention" },
  ];
  return (
    <section className="headline" aria-label="Headline counts">
      {tiles.map((t) => (
        <button key={t.key} className={`count-tile ${t.tone ?? ""} ${scope === t.key ? "on" : ""}`} onClick={() => onScope(t.key)} aria-pressed={scope === t.key}>
          <Count className="count-value mono" value={t.value} />
          <span className="count-label">{t.label}</span>
        </button>
      ))}
    </section>
  );
}
