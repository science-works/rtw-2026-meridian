// The single in-memory state. Only the dashboard's demo controls mutate it:
// replay the recorded H&E incident, the presenter's Acknowledge, and reset.
import type { Alert, CellpathData, Estimate, EventRecord } from "../../shared/types";
import { computeAlerts } from "./domain/alerts";
import { estimateAll } from "./domain/estimate";
import { INCIDENT, splitStaged } from "./domain/incident";
import { loadData } from "./domain/load";
import { fireBasketFailure, isTriggerFired } from "./domain/trigger";
import { loadTargets, type Targets } from "./targets";

export class AlreadyFiredError extends Error {}
export class NotFoundError extends Error {}
export class ConflictError extends Error {}

export interface StateOptions {
  /** Pause between the incident's later recorded steps after Acknowledge (reload, repeat run). */
  stepMs?: number;
}

export interface MeridianState {
  readonly data: CellpathData;
  readonly version: number;
  readonly alerts: Alert[];
  readonly estimates: Map<string, Estimate>;
  readonly targets: Targets;
  /** Name of the feed adapter the data came from. */
  readonly feed: string;
  readonly triggerFired: boolean;
  /** Appends the whole recorded incident at once (v6 control; kept for compatibility). */
  fireBasketFailure(): { affectedCases: number; affectedSlides: number };
  /** Appends the failure and team-notified events (10:45–10:46). */
  replayIncident(): { affectedCases: number; affectedSlides: number };
  /** The presenter's Acknowledge: appends the recorded acknowledgement, then the later steps. */
  acknowledge(alertId: string): void;
  reset(): void;
  subscribe(fn: (version: number) => void): () => void;
}

export function createState(initial: CellpathData = loadData(), targets: Targets = loadTargets(), feed = "workbook", options: StateOptions = {}): MeridianState {
  const stepMs = options.stepMs ?? 2000;
  // The full workbook is the state after the incident; start (and reset) with it held back.
  const pristine = splitStaged(structuredClone(initial));
  let data = structuredClone(pristine.data);
  let version = 0;
  let baseline = new Set<string>();
  let alerts: Alert[] = [];
  let estimates = new Map<string, Estimate>();
  let timers: ReturnType<typeof setTimeout>[] = [];
  const listeners = new Set<(version: number) => void>();

  const derive = () => {
    alerts = computeAlerts(data).map((a) => (baseline.has(a.id) ? a : { ...a, arrivedLive: true }));
    estimates = estimateAll({ data, alerts, targets });
  };
  const commit = (next: CellpathData) => {
    data = next;
    derive();
    version += 1;
    for (const fn of listeners) fn(version);
  };
  const reset = () => {
    timers.forEach(clearTimeout);
    timers = [];
    data = structuredClone(pristine.data);
    baseline = new Set(computeAlerts(data).map((a) => a.id));
  };
  reset();
  derive();

  /** Appends the staged events whose IDs are given, in recorded time order. */
  const append = (ids: string[]) => {
    const add = pristine.staged.filter((e) => ids.includes(e.eventId) && !data.events.some((x) => x.eventId === e.eventId));
    if (add.length) commit({ ...data, events: [...data.events, ...add] });
  };
  const snapshots = pristine.staged.filter((e: EventRecord) => e.type === "CURRENT_STAGE_SNAPSHOT").map((e) => e.eventId);
  const basketCounts = () => {
    const basket = alerts.find((a) => a.kind === "basket_failure")!;
    return { affectedCases: basket.caseIds.length, affectedSlides: basket.slideIds?.length ?? 0 };
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
      if (isTriggerFired(data)) throw new AlreadyFiredError("The H&E incident has already been replayed");
      commit(fireBasketFailure(data, pristine.staged));
      return basketCounts();
    },
    replayIncident() {
      if (isTriggerFired(data)) throw new AlreadyFiredError("The H&E incident has already been replayed");
      append([INCIDENT.failure.id, INCIDENT.notified.id]);
      return basketCounts();
    },
    acknowledge(alertId) {
      const alert = alerts.find((a) => a.id === alertId);
      if (!alert) throw new NotFoundError(`No open alert ${alertId}`);
      if (alert.kind !== "basket_failure") {
        throw new ConflictError("No acknowledgement is recorded for this alert in the simulated data; staff act on it in the lab.");
      }
      if (alert.state !== "new") throw new ConflictError(`Already ${alert.state.replace("_", " ")}`);
      append([INCIDENT.acknowledged.id, INCIDENT.troubleshooting.id]);
      // The later recorded steps follow on their own, a moment apart, so the change is visible.
      timers.push(setTimeout(() => append([INCIDENT.reloaded.id]), stepMs));
      timers.push(setTimeout(() => append([INCIDENT.repeatStarted.id, ...snapshots]), stepMs * 2));
    },
    reset() {
      reset();
      commit(data);
    },
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
}
