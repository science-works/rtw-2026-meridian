// The single in-memory state: the full workbook at Tuesday 11:30. The only mutations are
// the presenter's Acknowledge (a session action, never a lab event) and Reset demo.
import type { Alert, CellpathData, Estimate } from "../../shared/types";
import { computeAlerts } from "./domain/alerts";
import { estimateAll } from "./domain/estimate";
import { loadData } from "./domain/load";
import { loadTargets, type Targets } from "./targets";

export class AlreadyFiredError extends Error {}
export class NotFoundError extends Error {}
export class ConflictError extends Error {}

export interface MeridianState {
  readonly data: CellpathData;
  readonly version: number;
  readonly alerts: Alert[];
  readonly estimates: Map<string, Estimate>;
  readonly targets: Targets;
  /** Name of the feed adapter the data came from. */
  readonly feed: string;
  /** Always true: the recorded H&E incident is part of the 11:30 data. */
  readonly triggerFired: boolean;
  /** Kept for API compatibility: there is nothing to replay (409). */
  fireBasketFailure(): never;
  replayIncident(): never;
  /** The presenter's Acknowledge: New or Check needed → Acknowledged, awaiting check. Never resolves. */
  acknowledge(alertId: string): void;
  reset(): void;
  subscribe(fn: (version: number) => void): () => void;
}

const ALREADY = "The H&E incident is already recorded in the 11:30 data; there is nothing to replay.";

export function createState(initial: CellpathData = loadData(), targets: Targets = loadTargets(), feed = "workbook"): MeridianState {
  const data = structuredClone(initial);
  let version = 0;
  const acks = new Set<string>();
  let alerts: Alert[] = [];
  let estimates = new Map<string, Estimate>();
  const listeners = new Set<(version: number) => void>();

  const derive = () => {
    alerts = computeAlerts(data).map((a) =>
      acks.has(a.id)
        ? {
            ...a,
            state: "acknowledged" as const,
            stateDetail: "Acknowledged — awaiting check",
            history: [...a.history, { at: data.meta.clock, label: "Acknowledged by the presenter (this demo session; not a lab event)" }],
          }
        : a,
    );
    estimates = estimateAll({ data, alerts, targets });
  };
  const changed = () => {
    derive();
    version += 1;
    for (const fn of listeners) fn(version);
  };
  derive();

  return {
    data,
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
    triggerFired: true,
    fireBasketFailure() {
      throw new AlreadyFiredError(ALREADY);
    },
    replayIncident() {
      throw new AlreadyFiredError(ALREADY);
    },
    acknowledge(alertId) {
      const alert = alerts.find((a) => a.id === alertId);
      if (!alert) throw new NotFoundError(`No incident ${alertId}`);
      if (alert.state !== "new" && alert.state !== "check_needed") throw new ConflictError(`Already ${alert.stateDetail ?? alert.state}`);
      acks.add(alertId);
      changed();
    },
    reset() {
      acks.clear();
      changed();
    },
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
}
