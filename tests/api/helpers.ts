import { createApp } from "../../server/src/app";
import { loadData } from "../../server/src/domain/load";
import { createState } from "../../server/src/state";
import type { Targets } from "../../server/src/targets";

const NO_TARGETS: Targets = { urgent: null, screening: null, routine: null };

/** A fresh app with its own in-memory state, so tests never share mutations. */
export function freshApp(targets: Targets = NO_TARGETS) {
  const state = createState(loadData(), targets);
  const app = createApp(state);
  const get = async <T = unknown>(path: string) => {
    const res = await app.request(path);
    return { status: res.status, body: (await res.json()) as T };
  };
  const post = async <T = unknown>(path: string) => {
    const res = await app.request(path, { method: "POST" });
    return { status: res.status, body: (await res.json()) as T };
  };
  return { app, state, get, post };
}
