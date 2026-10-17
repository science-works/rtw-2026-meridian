// Feed adapters: where Meridian's events come from. The rules, estimates, API and MCP
// tools only ever see the normalised CellpathData shape (shared/types.ts), so a lab
// connects its own system by writing an adapter, not by changing the rules.
import { basename } from "node:path";
import type { CellpathData } from "../../shared/types";
import { DATA_PATH, loadData } from "./domain/load";

export interface FeedAdapter {
  /** Short name shown in /api/health and /api/events. */
  readonly name: string;
  /** Where the data comes from, in plain words. */
  readonly description: string;
  /** Returns the full normalised dataset. Called at start-up and on reset. */
  load(): CellpathData;
}

/** Default: the fictional workbook, converted by scripts/convert.ts into data/cellpath.json. */
export function workbookFeed(path: string = DATA_PATH): FeedAdapter {
  return {
    name: "workbook",
    description: "Fictional dataset from data/CellPath_Mock_Data.xlsx, converted to data/cellpath.json (simulated)",
    load: () => loadData(path),
  };
}

/** Any lab export already mapped to the CellpathData JSON shape (see docs/EVENT_MODEL.md). */
export function jsonExportFeed(path: string): FeedAdapter {
  return {
    name: "json export",
    description: `Normalised export from ${basename(path)}`,
    load: () => loadData(path),
  };
}

/** MERIDIAN_DATA=/path/to/export.json selects a JSON export; otherwise the workbook feed. */
export function resolveFeed(env: Record<string, string | undefined> = process.env): FeedAdapter {
  return env.MERIDIAN_DATA ? jsonExportFeed(env.MERIDIAN_DATA) : workbookFeed();
}
