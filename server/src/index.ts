import { serve } from "@hono/node-server";
import { API_PORT } from "../../shared/types";
import { createApp } from "./app";

serve({ fetch: createApp().fetch, port: API_PORT }, (info) => {
  console.log(`Meridian API (simulated data) on http://localhost:${info.port}`);
});
