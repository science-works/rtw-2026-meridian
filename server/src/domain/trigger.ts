import type { CellpathData, EventRecord } from "../../../shared/types";
import { INCIDENT } from "./incident";

export function isTriggerFired(data: CellpathData): boolean {
  return data.events.some((e) => e.eventId === INCIDENT.failure.id);
}

/**
 * Appends the staged incident events to the log, once. Returns a new dataset;
 * never mutates the input. Throws if the incident is already in the log.
 */
export function fireBasketFailure(data: CellpathData, staged: EventRecord[]): CellpathData {
  if (isTriggerFired(data)) throw new Error("The H&E incident has already been replayed");
  if (!staged.some((e) => e.eventId === INCIDENT.failure.id)) throw new Error(`Staged event ${INCIDENT.failure.id} not found`);
  return { ...data, events: [...data.events, ...staged] };
}
