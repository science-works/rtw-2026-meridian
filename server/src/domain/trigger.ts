import type { CellpathData } from "../../../shared/types";
import { PENDING_TRIGGER_ID } from "./validate";

export function isTriggerFired(data: CellpathData): boolean {
  return data.events.some((e) => e.eventId === PENDING_TRIGGER_ID && e.activation === "Recorded");
}

/**
 * Appends the staged basket-failure event to the recorded history, once.
 * Returns a new dataset; never mutates the input. Throws if already fired.
 */
export function fireBasketFailure(data: CellpathData): CellpathData {
  const staged = data.events.find((e) => e.eventId === PENDING_TRIGGER_ID);
  if (!staged) throw new Error(`Staged event ${PENDING_TRIGGER_ID} not found`);
  if (staged.activation === "Recorded") throw new Error("Basket failure has already been triggered");
  return {
    ...data,
    events: [...data.events.filter((e) => e !== staged), { ...staged, activation: "Recorded" }],
  };
}
