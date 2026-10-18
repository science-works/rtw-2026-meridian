// Meridian chat (spec Screen E) without a model: intent matching plus the same read functions
// the UI uses. Pattern: direct answer → case IDs and recorded stage → evidence → estimate or
// "unknown" → the staff check. Never diagnosis, reporting times or programme deadlines.
import type { Alert, CaseDetail, CaseSummary, ChatAnswer, DelayedResponse, StationCard } from "../../../shared/types";

export interface ChatReader {
  cases(): CaseSummary[];
  caseDetail(id: string): CaseDetail | null;
  stations(): StationCard[];
  alerts(): Alert[];
  delayed(programme?: string): DelayedResponse;
}

const CASE_ID = /\b(\d{2}H\d{4})\b/i;
const time = (at: string) => (at.startsWith("Day 1 ") ? at.slice(-5) : at);
const etaLine = (c: CaseSummary) =>
  c.estimate.status === "ready"
    ? `Ready for pathologist handoff since ${time(c.estimate.readyAt!)}.`
    : c.estimate.status === "estimated"
      ? `Ready for pathologist ~${time(c.estimate.readyAt!)} (configured step durations; queues not modelled).`
      : `Handoff time unknown: ${(c.estimate.reasonUnknown ?? "not enough information").replace(/\.$/, "")}.`;
const caseLink = (id: string) => ({ label: `Open ${id}`, to: `/case/${id}` });
const incidentLink = (a: Alert) => ({ label: "Open the incident", to: `/incident/${encodeURIComponent(a.id)}` });
const list = (ids: string[], max = 12) => (ids.length <= max ? ids.join(", ") : `${ids.slice(0, max).join(", ")} and ${ids.length - max} more`);

const STATION_ALIASES: [RegExp, (n: string) => string][] = [
  [/processor\s*([a-d])\b/i, (n) => `processor-${n.toLowerCase()}`],
  [/embedd(?:ing|er)(?:\s*station)?\s*([12])\b/i, (n) => `embedding-${n}`],
  [/microtom(?:y|e)(?:\s*station)?\s*([1-6])\b/i, (n) => `microtomy-${n}`],
  [/(?:digital\s*)?scanner\s*([12])\b/i, (n) => `scanner-${n}`],
  [/\bstainer\b/i, () => "stainer-1"],
  [/\biqc\b/i, () => "iqc-1"],
  [/microtomy queue/i, () => "microtomy-queue"],
  [/decalcification/i, () => "decal"],
];

export function answerQuestion(question: string, r: ChatReader): ChatAnswer {
  const q = question.trim();
  const base = { question: q, facts: [] as string[], caseIds: [] as string[], links: [] as ChatAnswer["links"], sources: [] as string[] };

  if (/diagnos|report(ed|ing)?\b|result|deadline|patient|treat|malignan|cancer/i.test(q)) {
    return {
      ...base,
      intent: "out_of_scope",
      answer: "Meridian covers lab preparation up to the handoff to the pathologist. It does not interpret tissue, and it gives no times after the handoff or for screening programmes.",
      facts: ["Ask where a case is, why it is waiting, or when it may reach the pathologist."],
    };
  }

  const idMatch = CASE_ID.exec(q);
  if (/basket|h&e[- ]?basket|stain(er)? (failure|fault)/i.test(q) && !idMatch) {
    const a = r.alerts().find((x) => x.kind === "basket_failure");
    if (!a) return { ...base, intent: "basket", answer: "No basket incident is recorded.", sources: ["list_alerts"] };
    const cases = r.cases().filter((c) => a.caseIds.includes(c.caseId));
    return {
      ...base,
      intent: "basket",
      answer: `${a.where.split(" · ").at(-1)} affects ${a.slideIds?.length ?? 0} slides across ${a.caseIds.length} cases: ${list(a.caseIds)}.`,
      facts: [
        ...a.history.map((h) => `${time(h.at)} · ${h.label}${h.eventId ? ` (${h.eventId})` : ""}`),
        `Status: ${a.stateDetail ?? a.state}.`,
        ...cases.map((c) => `${c.caseId}: ${c.location}. ${etaLine(c)}`),
        `Suggested check: ${a.suggestedCheck}`,
      ],
      caseIds: a.caseIds,
      links: [incidentLink(a), { label: "Open the stainer", to: "/station/stainer-1" }],
      sources: ["list_alerts", "get_case"],
    };
  }

  if (idMatch) {
    const id = idMatch[1].toUpperCase();
    const d = r.caseDetail(id);
    const why = /why|wait|hold|stuck|late/i.test(q);
    if (!d) return { ...base, intent: why ? "why_case" : "where_case", answer: `No case ${id} in the simulated dataset. Not enough information to answer.`, sources: ["get_case"] };
    const alerts = r.alerts().filter((a) => d.alertIds.includes(a.id));
    const tags = [d.priority === "Urgent" ? "urgent (recorded priority)" : null, d.programmeTag].filter(Boolean).join(", ");
    const facts = [
      `Recorded stage: ${d.stage} since ${time(d.stageEnteredAt)}.`,
      d.waiting.latest ? `Latest event ${time(d.waiting.latest.at)}: ${d.waiting.latest.text}` : "No event recorded for this case.",
      ...(d.waiting.missing ? [`Next event not yet recorded: ${d.waiting.missing}.`] : []),
      ...alerts.flatMap((a) => [`Incident: ${a.what} (${a.stateDetail ?? a.state}).`, ...a.evidence.map((e) => `Evidence${e.eventId ? ` ${e.eventId}` : ""}: ${e.text}`), `Suggested check: ${a.suggestedCheck}`]),
      etaLine(d),
    ];
    const answer = why
      ? alerts.length
        ? `${id} is held at ${d.location}: ${alerts.map((a) => a.what).join("; ")}.`
        : d.estimate.status === "ready"
          ? `${id} is not waiting: lab preparation is complete.`
          : `${id} is at ${d.location}; no incident is recorded. ${d.waiting.missing ? `The next recorded step is still missing: ${d.waiting.missing}.` : ""}`.trim()
      : `${id}${tags ? ` (${tags})` : ""} is at ${d.location}: ${d.stage}.`;
    return { ...base, intent: why ? "why_case" : "where_case", answer, facts, caseIds: [id], links: [caseLink(id), ...alerts.map(incidentLink)], sources: ["get_case", ...(alerts.length ? ["list_alerts"] : [])] };
  }

  if (/urgent/i.test(q)) {
    const held = r.cases().filter((c) => c.priority === "Urgent" && c.estimate.status !== "ready");
    const facts = held.map((c) => {
      const d = r.caseDetail(c.caseId)!;
      return `${c.caseId}: ${c.location === c.stage ? c.stage : `${c.location} (${c.stage})`}${d.waiting.missing ? ` · waiting for: ${d.waiting.missing.replace(/\.$/, "")}` : ""}. ${etaLine(c)}`;
    });
    return {
      ...base,
      intent: "urgent",
      answer: held.length ? `${held.length} urgent cases are not yet ready. Each waits for its next recorded step; no fault is recorded unless listed.` : "Every urgent case is ready for pathologist handoff.",
      facts,
      caseIds: held.map((c) => c.caseId),
      links: [{ label: "Open urgent cases", to: "/section/urgent" }],
      sources: ["get_case"],
    };
  }

  if (/screening|bcsp|csp|programme/i.test(q)) {
    const d = r.delayed("any");
    return {
      ...base,
      intent: "screening_delayed",
      answer: d.cases.length
        ? `${d.cases.length} screening-linked cases have a recorded hold: ${list(d.cases.map((c) => c.caseId))}.${d.note ? ` Lateness: ${d.note} (no target is configured).` : ""}`
        : `No screening-linked case has a recorded hold.${d.note ? ` Lateness: ${d.note}.` : ""}`,
      facts: d.cases.map((c) => `${c.caseId} (${c.programmeTag}): ${c.location}. ${etaLine(c)}`),
      caseIds: d.cases.map((c) => c.caseId),
      links: [
        { label: "Open BCSP", to: "/section/bcsp" },
        { label: "Open CSP", to: "/section/csp" },
      ],
      sources: ["cases_delayed"],
    };
  }

  for (const [re, toId] of STATION_ALIASES) {
    const m = re.exec(q);
    if (!m) continue;
    const card = r.stations().find((s) => s.id === toId(m[1] ?? ""));
    if (!card) break;
    return {
      ...base,
      intent: "station",
      answer: card.caseIds.length ? `${card.label} holds ${card.caseIds.length} case${card.caseIds.length === 1 ? "" : "s"}: ${list(card.caseIds)}.` : `No case is recorded at ${card.label}.`,
      facts: [`State: ${card.state}.`, ...(card.items ?? []), ...(card.latestEvent ? [`Latest event ${time(card.latestEvent.at)}: ${card.latestEvent.text}`] : [])],
      caseIds: card.caseIds,
      links: [{ label: `Open ${card.label}`, to: `/station/${card.id}` }],
      sources: ["stations"],
    };
  }

  return {
    ...base,
    intent: "unknown",
    answer: "Not enough information: I can answer where a case is, why it is waiting, what is at a station, which cases a basket affects, what holds the urgent cases, and which screening-linked cases have holds.",
  };
}
