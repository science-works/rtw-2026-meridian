// In-memory log of reads made by AI agents through the MCP server, for the dashboard's
// agent console. Separate from case state: logging never changes a case.
import type { AgentActivity, Alert, CaseDetail, CaseSummary, DelayedResponse, EventsPage, Overview } from "../../shared/types";

export type ActivityEvent = { type: "add"; record: AgentActivity } | { type: "clear" };

export interface ActivityLog {
  add(record: Omit<AgentActivity, "id">): AgentActivity;
  list(): AgentActivity[];
  clear(): void;
  subscribe(fn: (e: ActivityEvent) => void): () => void;
}

export function createActivityLog(capacity = 50): ActivityLog {
  let records: AgentActivity[] = [];
  let nextId = 1;
  const listeners = new Set<(e: ActivityEvent) => void>();
  const emit = (e: ActivityEvent) => listeners.forEach((fn) => fn(e));
  return {
    add(r) {
      const record = { id: nextId++, ...r };
      records = [...records, record].slice(-capacity);
      emit({ type: "add", record });
      return record;
    },
    list: () => records,
    clear() {
      records = [];
      emit({ type: "clear" });
    },
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
}

const FILTER_KEYS = ["stage", "priority", "programme", "demo", "caseId", "type", "offset", "limit"];

/** Summary of an API response, built by code (the console never shows model text). */
export function summarise(path: string, query: Record<string, string>, status: number, body: unknown): Pick<AgentActivity, "args" | "resultSummary" | "caseIds"> {
  const args: Record<string, string> = Object.fromEntries(Object.entries(query).filter(([k]) => FILTER_KEYS.includes(k)));
  const caseMatch = /^\/api\/cases\/([^/]+)$/.exec(path);
  if (caseMatch) {
    const id = decodeURIComponent(caseMatch[1]).toUpperCase();
    if (status === 404) return { args: { case_id: id }, resultSummary: `${id} · not found`, caseIds: [] };
    const c = body as CaseDetail;
    const est = c.estimate.status === "estimated" ? `est. ${c.estimate.readyAt}` : c.estimate.status === "ready" ? `ready since ${c.estimate.readyAt}` : "est. unknown";
    return { args: { case_id: c.caseId }, resultSummary: `${c.caseId} · ${c.stage} · ${est}`, caseIds: [c.caseId] };
  }
  switch (path) {
    case "/api/alerts": {
      const alerts = body as Alert[];
      const ids = [...new Set(alerts.flatMap((a) => a.caseIds))];
      return { args, resultSummary: `${alerts.length} alert${alerts.length === 1 ? "" : "s"} · ${ids.length} case${ids.length === 1 ? "" : "s"}`, caseIds: ids };
    }
    case "/api/delayed": {
      const d = body as DelayedResponse;
      return { args, resultSummary: `${d.cases.length} case${d.cases.length === 1 ? "" : "s"} on hold${d.note ? ` · ${d.note}` : ""}`, caseIds: d.cases.map((c) => c.caseId) };
    }
    case "/api/cases": {
      const list = body as CaseSummary[];
      return { args, resultSummary: `${list.length} cases`, caseIds: list.slice(0, 20).map((c) => c.caseId) };
    }
    case "/api/overview": {
      const o = body as Overview;
      return { args, resultSummary: `${o.total} cases · clock ${o.clock}`, caseIds: [] };
    }
    case "/api/events": {
      const e = body as EventsPage;
      return { args, resultSummary: `${e.events.length} of ${e.total} events`, caseIds: [...new Set(e.events.map((x) => x.caseId))].slice(0, 20) };
    }
    case "/api/health":
      return { args, resultSummary: `clock ${(body as { clock: string }).clock}`, caseIds: [] };
    default:
      return { args, resultSummary: path, caseIds: [] };
  }
}

export const wallClock = () => new Date().toTimeString().slice(0, 8);
