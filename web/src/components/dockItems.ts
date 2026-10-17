import type { Alert } from "../../../shared/types";

export interface DockItem {
  id: string;
  label: string;
  /** macOS-dock bounce: only a New incident that arrived live, until it is acknowledged. */
  bounce: boolean;
}

/** One red "!" per open incident, oldest first (spec §6; Victoria's dock). */
export function dockItems(alerts: Alert[], motionOn: boolean): DockItem[] {
  return alerts
    .filter((a) => a.state !== "resolved")
    .sort((a, b) => a.raisedAt.localeCompare(b.raisedAt))
    .map((a) => ({ id: a.id, label: `${a.what} (${a.state.replace("_", " ")})`, bounce: motionOn && a.state === "new" && !!a.arrivedLive }));
}
