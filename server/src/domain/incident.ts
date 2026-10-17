// The recorded H&E basket incident (spec §5.3). It is held back on start and on reset,
// and replayed from the dashboard. Event IDs are not chronological: always sort by time.
import { parseSimTime } from "../../../shared/clock";
import type { CellpathData, EventRecord } from "../../../shared/types";

export const INCIDENT_BASKET = "H&E-BASKET-01";

export const INCIDENT = {
  failure: { id: "EV-01215", type: "STAIN_RUN_FAILED" },
  notified: { id: "EV-01250", type: "TEAM_NOTIFIED" },
  acknowledged: { id: "EV-01255", type: "INCIDENT_ACKNOWLEDGED" },
  troubleshooting: { id: "EV-01251", type: "TROUBLESHOOTING_STARTED" },
  reloaded: { id: "EV-01254", type: "BASKET_RELOADED" },
  repeatStarted: { id: "EV-01256", type: "REPEAT_STAIN_STARTED" },
} as const;

export const byTime = (a: EventRecord, b: EventRecord) => parseSimTime(a.at) - parseSimTime(b.at) || a.eventId.localeCompare(b.eventId);

/** Cases with slides in the incident basket. */
export function incidentCases(data: CellpathData): string[] {
  return [...new Set(data.slides.filter((s) => s.basket === INCIDENT_BASKET).map((s) => s.caseId))].sort();
}

/**
 * Events held back until the replay: the six incident events, plus the affected cases'
 * 11:30 snapshot events, whose text already describes the failure.
 */
export function stagedIncidentIds(data: CellpathData): Set<string> {
  const affected = new Set(incidentCases(data));
  const ids = new Set<string>(Object.values(INCIDENT).map((e) => e.id));
  for (const e of data.events) {
    if (e.type === "CURRENT_STAGE_SNAPSHOT" && affected.has(e.caseId) && /failed/i.test(e.details)) ids.add(e.eventId);
  }
  return ids;
}

/** Splits the full workbook into the 11:30 log without the incident, and the staged events in time order. */
export function splitStaged(full: CellpathData): { data: CellpathData; staged: EventRecord[] } {
  const ids = stagedIncidentIds(full);
  return {
    data: { ...full, events: full.events.filter((e) => !ids.has(e.eventId)) },
    staged: full.events.filter((e) => ids.has(e.eventId)).sort(byTime),
  };
}
