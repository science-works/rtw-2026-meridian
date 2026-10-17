import { useCallback, useEffect, useRef, useState } from "react";
import type { Alert, CaseSummary, Overview } from "../../shared/types";
import { api } from "./api";

export interface LiveState {
  overview: Overview | null;
  alerts: Alert[];
  cases: CaseSummary[];
  version: number;
  connected: boolean;
  error: string | null;
}

/** Fetches the dashboard state and re-fetches whenever the server emits state-changed. */
export function useLive(): LiveState & { refresh: () => Promise<void> } {
  const [state, setState] = useState<LiveState>({ overview: null, alerts: [], cases: [], version: -1, connected: false, error: null });
  const latest = useRef(0);

  const refresh = useCallback(async () => {
    const ticket = ++latest.current;
    try {
      const [overview, alerts, cases] = await Promise.all([api.overview(), api.alerts(), api.cases()]);
      if (ticket === latest.current) setState((s) => ({ ...s, overview, alerts, cases, error: null }));
    } catch (e) {
      setState((s) => ({ ...s, error: e instanceof Error ? e.message : String(e) }));
    }
  }, []);

  useEffect(() => {
    void refresh();
    const es = new EventSource("/api/stream");
    es.addEventListener("state-changed", (ev) => {
      const { version } = JSON.parse((ev as MessageEvent).data) as { version: number };
      setState((s) => ({ ...s, version, connected: true }));
      void refresh();
    });
    es.onopen = () => setState((s) => ({ ...s, connected: true }));
    es.onerror = () => setState((s) => ({ ...s, connected: false }));
    return () => es.close();
  }, [refresh]);

  return { ...state, refresh };
}
