import { createApp } from "../../server/src/app";
import { createState } from "../../server/src/state";

/** A fresh app with its own in-memory state, so tests never share mutations. */
export function freshApp() {
  const state = createState();
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
