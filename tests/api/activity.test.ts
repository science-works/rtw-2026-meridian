import { describe, expect, it } from "vitest";
import type { AgentActivity } from "../../shared/types";
import { freshApp } from "./helpers";

const MCP = (tool: string, run?: string) => ({
  headers: { "X-Meridian-Client": "mcp", "X-Meridian-Tool": tool, ...(run ? { "X-Meridian-Run": run } : {}) },
});

describe("Agent-Live: activity log of MCP reads", () => {
  it("records tagged reads with code-built summaries and the cases they touched", async () => {
    const { app, get } = freshApp();
    await app.request("/api/alerts", MCP("list_alerts"));
    await app.request("/api/cases/26H1005", MCP("get_case"));
    await app.request("/api/delayed", MCP("cases_delayed"));
    const log = (await get<AgentActivity[]>("/api/agent/activity")).body;
    expect(log.map((a) => a.tool)).toEqual(["list_alerts", "get_case", "cases_delayed"]);
    expect(log[0].resultSummary).toBe("3 alerts · 3 cases");
    expect(log[0].caseIds.sort()).toEqual(["26H1003", "26H1004", "26H1015"]);
    expect(log[1]).toMatchObject({ args: { case_id: "26H1005" }, resultSummary: "26H1005 · H&E staining · est. Day 1 11:40", caseIds: ["26H1005"] });
    expect(log[2].resultSummary).toBe("3 cases on hold · target comparison unavailable");
    expect(log[0].at).toMatch(/^\d\d:\d\d:\d\d$/);
  });

  it("ignores untagged requests (the dashboard's own reads)", async () => {
    const { app, get } = freshApp();
    await app.request("/api/alerts");
    await app.request("/api/cases/26H1005");
    expect((await get<AgentActivity[]>("/api/agent/activity")).body).toEqual([]);
  });

  it("never changes case state", async () => {
    const { app, state } = freshApp();
    const v = state.version;
    for (const p of ["/api/alerts", "/api/cases/26H1003", "/api/delayed", "/api/overview", "/api/events"]) await app.request(p, MCP("get_case"));
    expect(state.version).toBe(v);
    expect(state.triggerFired).toBe(false);
  });

  it("groups calls by run and reports unknown estimates and missing cases plainly", async () => {
    const { app, get } = freshApp();
    await app.request("/api/cases/26H1003", MCP("get_case", "run-1"));
    await app.request("/api/cases/26H9999", MCP("get_case", "run-1"));
    const log = (await get<AgentActivity[]>("/api/agent/activity")).body;
    expect(log.every((a) => a.runId === "run-1")).toBe(true);
    expect(log[0].resultSummary).toBe("26H1003 · Waiting for dissection/cut-up · est. unknown");
    expect(log[1].resultSummary).toBe("26H9999 · not found");
  });

  it("keeps only the last 50 records", async () => {
    const { app, get } = freshApp();
    for (let i = 0; i < 55; i++) await app.request("/api/overview", MCP("overview"));
    const log = (await get<AgentActivity[]>("/api/agent/activity")).body;
    expect(log).toHaveLength(50);
    expect(log[0].resultSummary).toBe("450 cases · clock Day 1 11:30");
  });

  it("clears on POST /api/agent/clear and on reset", async () => {
    const { app, get, post } = freshApp();
    await app.request("/api/alerts", MCP("list_alerts"));
    expect((await post("/api/agent/clear")).status).toBe(200);
    expect((await get<AgentActivity[]>("/api/agent/activity")).body).toEqual([]);
    await app.request("/api/alerts", MCP("list_alerts"));
    await post("/api/sim/reset");
    expect((await get<AgentActivity[]>("/api/agent/activity")).body).toEqual([]);
  });

  it("streams each record over SSE as agent-activity", async () => {
    const { app } = freshApp();
    const res = await app.request("/api/stream");
    const reader = res.body!.getReader();
    const dec = new TextDecoder();
    let buf = "";
    let sent = false;
    let record: AgentActivity | null = null;
    while (!record) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      if (!sent && buf.includes("state-changed")) {
        sent = true;
        await app.request("/api/cases/26H1004", MCP("get_case"));
      }
      const m = /event: agent-activity\ndata: (.*)\n/.exec(buf);
      if (m) record = JSON.parse(m[1]);
    }
    await reader.cancel();
    expect(record).toMatchObject({ tool: "get_case", caseIds: ["26H1004"] });
  });
});
