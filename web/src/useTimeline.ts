// The recorded waypoints (GET /api/simulation), fetched once and shared by the simulation and section pages.
import { useEffect, useState } from "react";
import { timelineFrom, type Timeline } from "../../shared/simulation";
import type { SimulationResponse } from "../../shared/types";

export interface LoadedTimeline {
  timeline: Timeline;
  from: number;
  to: number;
}

let cache: Promise<LoadedTimeline> | null = null;
const load = () =>
  (cache ??= fetch("/api/simulation")
    .then((r) => (r.ok ? (r.json() as Promise<SimulationResponse>) : Promise.reject(new Error(String(r.status)))))
    .then((r) => ({ timeline: timelineFrom(r), from: r.from, to: r.to }))
    .catch((e) => {
      cache = null;
      throw e;
    }));

export function useTimeline(): { data: LoadedTimeline | null; error: string | null } {
  const [data, setData] = useState<LoadedTimeline | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    load().then((d) => live && setData(d), (e: Error) => live && setError(e.message));
    return () => {
      live = false;
    };
  }, []);
  return { data, error };
}
