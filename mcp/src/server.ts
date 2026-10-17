// Meridian MCP server: three read-only tools over the Meridian HTTP API.
// It keeps no data of its own, so Claude and the dashboard always see the same state.
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { Alert, CaseDetail, CaseSummary, DelayedResponse } from "../../shared/types";

/** Fetches an API path (e.g. "/api/alerts"). Over HTTP in production, in-process in tests. */
export type ApiFetch = (path: string) => Response | Promise<Response>;

export const httpFetch =
  (base = process.env.MERIDIAN_API ?? "http://localhost:8787"): ApiFetch =>
  (path) =>
    fetch(new URL(path, base));

const DATA_NOTE = "Simulated data: fictional cases and illustrative timings; not connected to any laboratory.";
const ANSWER_PATTERN =
  "Direct answer → case IDs and recorded stage → evidence → handoff estimate with its assumptions, or 'unknown' with the reason → the suggested staff check. Plain language.";

const SCOPE =
  "Read-only. Simulated histology workflow data. Covers lab preparation up to pathologist handoff only.";

export const INSTRUCTIONS = [
  "Meridian is an open, read-only layer that sits alongside a histology lab's LIMS. This demo runs on simulated, fictional data.",
  "Use the tools for every case-specific fact; never answer from memory.",
  "Boundaries: never diagnose, interpret tissue, report cases, recommend patient management, or predict reporting times or screening-programme deadlines. Meridian estimates readiness for pathologist handoff only.",
  "If a tool returns 'unknown' or data is missing, say 'not enough information' and give the stated reason. Never invent events, times or causes. A missing scan event never proves a slide is misplaced.",
  "Delay is only claimed against a configured target; otherwise say 'target comparison unavailable'.",
  "You cannot change anything: no tool creates events, clears alerts, changes priority or edits data. Staff decide every action.",
  `Answer pattern: ${ANSWER_PATTERN}`,
].join("\n");

const READ_ONLY = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false } as const;

class ApiUnreachable extends Error {}

async function getJson<T>(api: ApiFetch, path: string): Promise<{ status: number; body: T }> {
  let res: Response;
  try {
    res = await api(path);
  } catch (e) {
    throw new ApiUnreachable(`Meridian API not reachable (${e instanceof Error ? e.message : String(e)}). Start it with \`npm run dev\`.`);
  }
  return { status: res.status, body: (await res.json()) as T };
}

const ok = (payload: object) => ({ content: [{ type: "text" as const, text: JSON.stringify({ ...payload, dataNote: DATA_NOTE }, null, 2) }] });
const failed = (e: unknown) => {
  if (e instanceof ApiUnreachable) return { isError: true, content: [{ type: "text" as const, text: e.message }] };
  throw e;
};

export function createMeridianMcp(api: ApiFetch = httpFetch()): McpServer {
  const server = new McpServer({ name: "meridian", version: "0.1.0" }, { instructions: INSTRUCTIONS });

  server.registerTool(
    "get_case",
    {
      title: "Get case",
      description: `${SCOPE} Returns one case: recorded stage, cohort, priority, programme tag, blocks, slides and levels, recorded timeline, active alerts, and the pathologist handoff estimate with its components and assumptions, or the reason it is unknown.`,
      inputSchema: { case_id: z.string().describe("Case ID, e.g. 26H1003") },
      annotations: READ_ONLY,
    },
    async ({ case_id }) => {
      try {
        const id = case_id.trim().toUpperCase();
        const res = await getJson<CaseDetail | { error: string }>(api, `/api/cases/${encodeURIComponent(id)}`);
        if (res.status === 404 || "error" in res.body) {
          return { content: [{ type: "text" as const, text: `Not enough information: there is no case ${id} in the simulated dataset. ${DATA_NOTE}` }] };
        }
        const c = res.body;
        const alerts = (await getJson<Alert[]>(api, "/api/alerts")).body.filter((a) => a.caseIds.includes(c.caseId));
        return ok({
          caseId: c.caseId,
          recordedStage: c.stage,
          stageEnteredAt: c.stageEnteredAt,
          cohort: c.cohort,
          priority: c.priority,
          programmeTag: c.programmeTag,
          specimen: c.specimen,
          detailedDemoCase: c.isDemo,
          blocks: c.blocks,
          slides: c.slides,
          alerts,
          estimate: c.estimate,
          timeline: c.timeline,
          answerPattern: ANSWER_PATTERN,
        });
      } catch (e) {
        return failed(e);
      }
    },
  );

  server.registerTool(
    "list_alerts",
    {
      title: "List alerts",
      description: `${SCOPE} Returns active alerts from the deterministic rules (outstanding block, protocol mismatch, stain run failure, missing scan event), each with what, evidence, why it is flagged, affected cases and slides, the event time, and the suggested staff check.`,
      inputSchema: {
        kind: z.enum(["outstanding_block", "protocol_mismatch", "basket_failure", "scan_gap"]).optional().describe("Only this alert type"),
        case_id: z.string().optional().describe("Only alerts affecting this case"),
      },
      annotations: READ_ONLY,
    },
    async ({ kind, case_id }) => {
      try {
        const id = case_id?.trim().toUpperCase();
        const alerts = (await getJson<Alert[]>(api, "/api/alerts")).body
          .filter((a) => !kind || a.kind === kind)
          .filter((a) => !id || a.caseIds.includes(id));
        return ok({ clock: (await getJson<{ clock: string }>(api, "/api/health")).body.clock, count: alerts.length, alerts, answerPattern: ANSWER_PATTERN });
      } catch (e) {
        return failed(e);
      }
    },
  );

  server.registerTool(
    "cases_delayed",
    {
      title: "Cases on hold or past target",
      description: `${SCOPE} Returns cases with a recorded hold (an active alert) and, only when a lab target is configured, cases whose estimate is past that target. Without a configured target it says "target comparison unavailable" and never claims a delay. Also lists urgent cases by recorded priority (a watch list, not a delay claim).`,
      inputSchema: {
        programme: z.string().optional().describe('"screening" for any screening-linked case, or an exact tag such as "BCSP" or "Cervical screening"'),
        priority: z.enum(["Urgent", "Routine"]).optional(),
      },
      annotations: READ_ONLY,
    },
    async ({ programme, priority }) => {
      try {
        const p = programme && /^screening$/i.test(programme.trim()) ? "any" : programme?.trim();
        const q = p ? `?programme=${encodeURIComponent(p)}` : "";
        const delayed = (await getJson<DelayedResponse>(api, `/api/delayed${q}`)).body;
        const cases = delayed.cases.filter((c) => !priority || c.priority === priority);
        const tracked = p ? (await getJson<CaseSummary[]>(api, `/api/cases${q}`)).body.length : undefined;
        const urgent = (await getJson<CaseSummary[]>(api, `/api/cases?priority=Urgent${p ? `&programme=${encodeURIComponent(p)}` : ""}`)).body;
        return ok({
          ...(delayed.note ? { note: delayed.note } : {}),
          count: cases.length,
          cases: cases.map((c) => ({
            caseId: c.caseId,
            recordedStage: c.stage,
            priority: c.priority,
            programmeTag: c.programmeTag,
            alertIds: c.alertIds,
            estimate: c.estimate,
          })),
          ...(tracked !== undefined ? { screeningCasesTracked: tracked } : {}),
          urgentWatchList: {
            note: "Urgent by recorded priority; listed for visibility, not as a delay claim.",
            cases: urgent.map((c) => ({
              caseId: c.caseId,
              recordedStage: c.stage,
              handoffEstimate: c.estimate.readyAt ?? `unknown: ${c.estimate.reasonUnknown ?? "not enough information"}`,
              alertIds: c.alertIds,
            })),
          },
          answerPattern: ANSWER_PATTERN,
        });
      } catch (e) {
        return failed(e);
      }
    },
  );

  return server;
}
