import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

export interface Targets {
  urgent: number | null;
  screening: number | null;
  routine: number | null;
}

const TARGETS_PATH = fileURLToPath(new URL("../../config/targets.json", import.meta.url));

/** Illustrative handoff targets set by the lab lead; null means not configured. */
export function loadTargets(path: string = TARGETS_PATH): Targets {
  const raw = JSON.parse(readFileSync(path, "utf8"));
  const num = (v: unknown) => (typeof v === "number" && v > 0 ? v : null);
  return { urgent: num(raw.urgent), screening: num(raw.screening), routine: num(raw.routine) };
}

export const hasAnyTarget = (t: Targets) => t.urgent !== null || t.screening !== null || t.routine !== null;
