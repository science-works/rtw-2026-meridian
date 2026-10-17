// The pitch script (pitch/SCRIPT.md via /api/pitch) and the presenter ↔ demo-window channel.
import { useEffect, useState } from "react";
import { parseScript, type Script } from "../../../shared/script";

let cache: Promise<Script> | null = null;
export function useScript(): { script: Script | null; error: string | null } {
  const [script, setScript] = useState<Script | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    cache ??= fetch("/api/pitch")
      .then((r) => (r.ok ? (r.json() as Promise<{ markdown: string }>) : Promise.reject(new Error(String(r.status)))))
      .then((r) => parseScript(r.markdown))
      .catch((e) => {
        cache = null;
        throw e;
      });
    cache.then((s) => live && setScript(s), (e: Error) => live && setError(e.message));
    return () => {
      live = false;
    };
  }, []);
  return { script, error };
}

export type StoryMessage = { type: "beat"; index: number } | { type: "exit" };
const NAME = "meridian-story";

/** Same-origin channel between the presenter window and the demo window. No server involved. */
export function openChannel(onMessage: (m: StoryMessage) => void): { post: (m: StoryMessage) => void; close: () => void } {
  if (typeof BroadcastChannel === "undefined") return { post: () => {}, close: () => {} };
  const ch = new BroadcastChannel(NAME);
  ch.onmessage = (e) => onMessage(e.data as StoryMessage);
  return { post: (m) => ch.postMessage(m), close: () => ch.close() };
}
