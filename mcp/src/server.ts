// Meridian MCP server: three read-only tools and one prompt over the Meridian HTTP API.
// It keeps no data of its own, so Claude and the dashboard always see the same state.
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { Alert, CaseDetail, CaseSummary, DelayedResponse, Estimate } from "../../shared/types";

/** Fetches an API path (e.g. "/api/alerts"). Over HTTP in production, in-process in tests. */
export type ApiFetch = (path: string) => Response | Promise<Response>;

export const httpFetch =
  (base = process.env.MERIDIAN_API_URL ?? process.env.MERIDIAN_API ?? "http://localhost:8787"): ApiFetch =>
  (path) =>
    fetch(new URL(path, base));

const DATA_NOTE = "Simulated data: fictional cases and illustrative timings; not connected to any laboratory.";
const ANSWER_PATTERN =
  "Direct answer → case IDs and recorded stage → evidence → handoff estimate with its assumptions, or 'unknown' with the reason → the suggested staff check. Plain language.";

const SCOPE = "Read-only. Simulated histology workflow data. Covers lab preparation up to pathologist handoff only.";

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

// ---------- Data functions shared by the tools and the shift_handover prompt ----------

export async function caseData(api: ApiFetch, caseId: string) {
  const id = caseId.trim().toUpperCase();
  const res = await getJson<CaseDetail | { error: string }>(api, `/api/cases/${encodeURIComponent(id)}`);
  if (res.status === 404 || "error" in res.body) return null;
  const c = res.body;
  const alerts = (await getJson<Alert[]>(api, "/api/alerts")).body.filter((a) => a.caseIds.includes(c.caseId));
  return {
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
  };
}

export async function alertsData(api: ApiFetch, filters: { kind?: Alert["kind"]; caseId?: string } = {}) {
  const id = filters.caseId?.trim().toUpperCase();
  const alerts = (await getJson<Alert[]>(api, "/api/alerts")).body
    .filter((a) => !filters.kind || a.kind === filters.kind)
    .filter((a) => !id || a.caseIds.includes(id));
  const clock = (await getJson<{ clock: string }>(api, "/api/health")).body.clock;
  return { clock, count: alerts.length, alerts };
}

export async function delayedData(api: ApiFetch, filters: { programme?: string; priority?: "Urgent" | "Routine" } = {}) {
  const p = filters.programme && /^screening$/i.test(filters.programme.trim()) ? "any" : filters.programme?.trim();
  const q = p ? `?programme=${encodeURIComponent(p)}` : "";
  const delayed = (await getJson<DelayedResponse>(api, `/api/delayed${q}`)).body;
  const cases = delayed.cases.filter((c) => !filters.priority || c.priority === filters.priority);
  const tracked = p ? (await getJson<CaseSummary[]>(api, `/api/cases${q}`)).body.length : undefined;
  const urgent = (await getJson<CaseSummary[]>(api, `/api/cases?priority=Urgent${p ? `&programme=${encodeURIComponent(p)}` : ""}`)).body;
  return {
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
  };
}

// ---------- shift_handover: a deterministic brief built from the same calls ----------

const estimateText = (e: Estimate) =>
  e.status === "ready"
    ? `ready for pathologist handoff since ${e.readyAt}`
    : e.status === "estimated"
      ? `handoff estimate ${e.readyAt}${e.components.some((c) => c.step.startsWith("Repeat")) ? " (includes the repeat H&E run)" : ""}`
      : `estimate unknown: ${e.reasonUnknown}`;

export async function buildShiftHandover(api: ApiFetch): Promise<string> {
  const { clock, alerts } = await alertsData(api);
  const affected = [...new Set(alerts.flatMap((a) => a.caseIds))];
  const cases = (await Promise.all(affected.map((id) => caseData(api, id)))).filter((c) => c !== null);
  const delayed = await delayedData(api);
  const all = (await getJson<CaseSummary[]>(api, "/api/cases")).body;

  const unknownCounts = new Map<string, number>();
  for (const c of all) if (c.estimate.status === "unknown" && !affected.includes(c.caseId)) {
    const r = c.estimate.reasonUnknown ?? "not enough information";
    unknownCounts.set(r, (unknownCounts.get(r) ?? 0) + 1);
  }
  const order = { high: 0, medium: 1 } as const;
  const sorted = [...alerts].sort((a, b) => order[a.severity] - order[b.severity]);
  const lines: string[] = [];
  const out = (s = "") => lines.push(s);

  out(`# Shift handover: ${clock} (simulated data)`);
  out(`Built from list_alerts → get_case for each affected case → cases_delayed. Read-only; staff decide every action. ${DATA_NOTE}`);
  out();
  out(`## Open alerts (${alerts.length})`);
  sorted.forEach((a, i) => {
    const ids = a.evidence.map((e) => e.eventId).filter(Boolean);
    out(`${i + 1}. [${a.severity.toUpperCase()}] ${a.what} (raised ${a.raisedAt})`);
    out(`   Evidence: ${ids.length ? ids.join(", ") : "see alert text"}. Cases: ${a.caseIds.join(", ")}.`);
    out(`   Why: ${a.why}`);
  });
  if (!alerts.length) out("None.");
  out();
  out(`## Cases at risk (${cases.length})`);
  for (const c of cases) out(`- ${c.caseId} · ${c.recordedStage}${c.priority === "Urgent" ? " · URGENT" : ""} · ${estimateText(c.estimate)}`);
  if (!cases.length) out("None.");
  out();
  out("## Unknowns (not enough information)");
  for (const c of cases.filter((x) => x.estimate.status === "unknown")) out(`- ${c.caseId}: ${c.estimate.reasonUnknown}`);
  for (const [reason, n] of [...unknownCounts].sort((a, b) => b[1] - a[1])) out(`- ${n} × ${reason}`);
  out();
  out(`## Urgent watch list (${delayed.urgentWatchList.cases.length}; recorded priority, not a delay claim)`);
  for (const u of delayed.urgentWatchList.cases) out(`- ${u.caseId} · ${u.recordedStage} · ${u.handoffEstimate.startsWith("unknown") ? u.handoffEstimate : `handoff estimate ${u.handoffEstimate}`}`);
  out();
  out("## Staff checks");
  for (const a of sorted) out(`- [ ] ${a.caseIds.length > 3 ? `${a.caseIds.length} cases (${a.caseIds[0]}–${a.caseIds.at(-1)})` : a.caseIds.join(", ")}: ${a.suggestedCheck}`);
  out();
  out("## Targets");
  out(delayed.note ?? "Compared against config/targets.json.");
  out();
  out("## Not in scope");
  out("Diagnosis, reporting times and screening-programme deadlines are not in scope. Meridian covers lab preparation up to pathologist handoff.");
  return lines.join("\n");
}

/** Agent mode: the model makes the calls itself, so every step is visible and sourced. */
export function agentHandoverPrompt(focus?: string): string {
  return [
    "I'm starting the next shift in the histology lab. Use the Meridian tools (read-only, simulated data) to brief me.",
    focus ? `Focus: ${focus}. Cover it first, then the rest.` : "",
    "",
    "Steps, in this order:",
    "1. Call list_alerts.",
    "2. For each affected case in those alerts, call get_case (one call per case ID; for a basket failure, one representative case is enough if the others share its stage and estimate, and say so).",
    "3. Call cases_delayed.",
    "",
    "Then write the brief with exactly these sections:",
    "1. Open alerts: each with its severity, what happened, and its evidence event IDs (e.g. EV-01215).",
    "2. Cases at risk: case ID, recorded stage, and the handoff estimate, or 'unknown' with the reason the tool gives.",
    "3. Things we can't know yet: every 'unknown' or missing value, said as 'not enough information' plus the reason. Include the target comparison note.",
    "4. Suggested staff checks: the suggestedCheck from each alert, as a checklist.",
    "5. Not in scope: diagnosis, reporting times and screening-programme deadlines; Meridian covers lab preparation up to pathologist handoff.",
    "",
    "Rules: cite case and event IDs from the tool results; invent nothing (no times, causes or events the tools did not return); no clinical advice; you cannot change anything in Meridian, so staff decide every action.",
  ]
    .filter((l, i, a) => l !== "" || a[i - 1] !== "")
    .join("\n");
}

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
        const c = await caseData(api, case_id);
        if (!c) {
          const id = case_id.trim().toUpperCase();
          return { content: [{ type: "text" as const, text: `Not enough information: there is no case ${id} in the simulated dataset. ${DATA_NOTE}` }] };
        }
        return ok({ ...c, answerPattern: ANSWER_PATTERN });
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
        return ok({ ...(await alertsData(api, { kind, caseId: case_id })), answerPattern: ANSWER_PATTERN });
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
        return ok({ ...(await delayedData(api, { programme, priority })), answerPattern: ANSWER_PATTERN });
      } catch (e) {
        return failed(e);
      }
    },
  );

  server.registerPrompt(
    "shift_handover",
    {
      title: "Shift handover brief",
      description: `${SCOPE} Agent mode (default): you investigate with list_alerts → get_case for each affected case → cases_delayed and write a sourced brief. Brief mode: Meridian returns the same brief, built in code from the same calls.`,
      argsSchema: {
        focus: z.string().optional().describe("Optional case ID or topic to emphasise, e.g. 26H1005 or 'screening'"),
        mode: z.enum(["agent", "brief"]).optional().describe("agent (default): the model calls the tools; brief: a deterministic brief built by Meridian"),
      },
    },
    async ({ focus, mode }) => {
      if (mode === "brief") {
        let brief: string;
        try {
          brief = await buildShiftHandover(api);
        } catch (e) {
          if (!(e instanceof ApiUnreachable)) throw e;
          brief = `Not enough information: ${e.message}`;
        }
        return {
          description: "Shift handover brief from live Meridian data (simulated)",
          messages: [
            {
              role: "user" as const,
              content: {
                type: "text" as const,
                text:
                  "Present this shift handover brief to the incoming shift. Keep every case ID, evidence ID and time exactly as given, add no facts, " +
                  "and say 'not enough information' wherever the brief says unknown. You may shorten the wording but keep every section.\n\n" +
                  brief,
              },
            },
          ],
        };
      }
      return {
        description: "Investigate the lab with Meridian's read-only tools and write a shift handover brief",
        messages: [{ role: "user" as const, content: { type: "text" as const, text: agentHandoverPrompt(focus) } }],
      };
    },
  );

  server.registerResource(
    "overview",
    "meridian://overview",
    { title: "Lab overview", description: `${SCOPE} Clock, totals and stage counts.`, mimeType: "application/json" },
    async (uri) => {
      const body = (await getJson<object>(api, "/api/overview")).body;
      return { contents: [{ uri: uri.href, mimeType: "application/json", text: JSON.stringify({ ...body, dataNote: DATA_NOTE }, null, 2) }] };
    },
  );

  return server;
}
