import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { CellpathData } from "../../../shared/types";

export const DATA_PATH = fileURLToPath(new URL("../../../data/cellpath.json", import.meta.url));

/** Reads the converted dataset. Run `npm run convert` first if the file is missing. */
export function loadData(path: string = DATA_PATH): CellpathData {
  return JSON.parse(readFileSync(path, "utf8")) as CellpathData;
}
