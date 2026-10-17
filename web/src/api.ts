import type { Alert, CaseDetail, CaseSummary, Overview, StationCard, TriggerResponse } from "../../shared/types";

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`${path}: ${res.status}`);
  return res.json() as Promise<T>;
}

export const api = {
  overview: () => getJson<Overview>("/api/overview"),
  alerts: () => getJson<Alert[]>("/api/alerts"),
  cases: () => getJson<CaseSummary[]>("/api/cases"),
  stations: () => getJson<StationCard[]>("/api/stations"),
  case: (id: string) => getJson<CaseDetail>(`/api/cases/${encodeURIComponent(id)}`),
  async trigger(): Promise<TriggerResponse | { error: string }> {
    const res = await fetch("/api/sim/basket-failure", { method: "POST" });
    return res.json();
  },
  async reset(): Promise<void> {
    await fetch("/api/sim/reset", { method: "POST" });
  },
  async clearAgent(): Promise<void> {
    await fetch("/api/agent/clear", { method: "POST" });
  },
};
