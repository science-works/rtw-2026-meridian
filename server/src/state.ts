// The single in-memory state. Only the simulator routes mutate it.
import type { Alert, CellpathData, Estimate } from "../../shared/types";
import { computeAlerts } from "./domain/alerts";
import { estimateAll } from "./domain/estimate";
import { loadData } from "./domain/load";
import { fireBasketFailure, isTriggerFired } from "./domain/trigger";
import { loadTargets, type Targets } from "./targets";

export class AlreadyFiredError extends Error {}

export interface MeridianState {
  readonly data: CellpathData;
  readonly version: number;
  readonly alerts: Alert[];
  readonly estimates: Map<string, Estimate>;
  readonly targets: Targets;
  /** Name of the feed adapter the data came from. */
  readonly feed: string;
  readonly triggerFired: boolean;
  fireBasketFailure(): { affectedCases: number; affectedSlides: number };
  reset(): void;
  subscribe(fn: (version: number) => void): () => void;
}

export function createState(initial: CellpathData = loadData(), targets: Targets = loadTargets(), feed = "workbook"): MeridianState {
  const pristine = structuredClone(initial);
  let data = structuredClone(initial);
  let version = 0;
  let alerts = computeAlerts(data);
  let estimates = estimateAll({ data, alerts, targets });
  const listeners = new Set<(version: number) => void>();

  const commit = (next: CellpathData) => {
    data = next;
    alerts = computeAlerts(data);
    estimates = estimateAll({ data, alerts, targets });
    version += 1;
    for (const fn of listeners) fn(version);
  };

  return {
    get data() {
      return data;
    },
    get version() {
      return version;
    },
    get alerts() {
      return alerts;
    },
    get estimates() {
      return estimates;
    },
    targets,
    feed,
    get triggerFired() {
      return isTriggerFired(data);
    },
    fireBasketFailure() {
      if (isTriggerFired(data)) throw new AlreadyFiredError("Basket failure has already been triggered");
      commit(fireBasketFailure(data));
      const basket = alerts.find((a) => a.kind === "basket_failure")!;
      return { affectedCases: basket.caseIds.length, affectedSlides: basket.slideIds?.length ?? 0 };
    },
    reset() {
      commit(structuredClone(pristine));
    },
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
}
