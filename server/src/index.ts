import { serve } from "@hono/node-server";
import { API_PORT } from "../../shared/types";
import { createApp } from "./app";
import { validate } from "./domain/validate";
import { resolveFeed } from "./feed";
import { createState } from "./state";
import { loadTargets } from "./targets";

const feed = resolveFeed();
const data = feed.load();
const { errors } = validate(data);
if (errors.length) {
  // Reported, not fatal: a lab's own export may legitimately differ from the demo workbook's reconciliation checks.
  console.warn(`Feed "${feed.name}" has ${errors.length} validation finding(s):`);
  for (const e of errors.slice(0, 20)) console.warn(`  [${e.code}] ${e.message}`);
}

serve({ fetch: createApp(createState(data, loadTargets(), feed.name)).fetch, port: API_PORT }, (info) => {
  console.log(`Meridian API (simulated data, feed: ${feed.name}) on http://localhost:${info.port}`);
});
