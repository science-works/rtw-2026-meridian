import { beforeEach, describe, expect, it } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createMeridianMcp } from "../../mcp/src/server";
import { findOverclaims } from "../../server/src/domain/wording";
import { freshApp } from "../api/helpers";

let client: Client;
let api: ReturnType<typeof freshApp>;

beforeEach(async () => {
  api = freshApp();
  // The MCP server reaches the API only through this fetch, exactly as it does over HTTP.
  const server = createMeridianMcp((path) => api.app.request(path));
  const [a, b] = InMemoryTransport.createLinkedPair();
  await server.connect(a);
  client = new Client({ name: "test", version: "0" });
  await client.connect(b);
});

async function call(name: string, args: Record<string, unknown> = {}) {
  const res = await client.callTool({ name, arguments: args });
  const text = (res.content as { type: string; text: string }[]).map((c) => c.text).join("\n");
  return { res, text, json: (() => { try { return JSON.parse(text); } catch { return null; } })() };
}

describe("C1: MCP server skeleton", () => {
  it("is named meridian and lists exactly three read-only tools", async () => {
    expect(client.getServerVersion()?.name).toBe("meridian");
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name).sort()).toEqual(["cases_delayed", "get_case", "list_alerts"]);
    for (const t of tools) {
      expect(t.annotations).toMatchObject({ readOnlyHint: true, destructiveHint: false, openWorldHint: false });
      expect(t.description).toMatch(/read-only/i);
      expect(t.description).toMatch(/simulated/i);
      expect(t.description).toMatch(/pathologist handoff/i);
    }
  });

  it("states the boundaries in its instructions", async () => {
    const instructions = client.getInstructions() ?? "";
    expect(instructions).toMatch(/never diagnose/i);
    expect(instructions).toMatch(/not enough information/i);
    expect(instructions).toMatch(/cannot change/i);
  });
});

describe("C2: tools return live data from the HTTP API", () => {
  it("get_case 26H1003: recorded stage, blocks, the F1 hold and no whole-case estimate", async () => {
    const { json } = await call("get_case", { case_id: "26H1003" });
    expect(json.caseId).toBe("26H1003");
    expect(json.recordedStage).toBe("Waiting for dissection/cut-up");
    expect(json.blocks.map((b: { blockId: string }) => b.blockId)).toEqual(["A1", "B1", "C1", "D1", "E1", "F1"]);
    expect(json.estimate.status).toBe("unknown");
    expect(json.estimate.reasonUnknown).toMatch(/F1/);
    expect(json.alerts[0].kind).toBe("outstanding_block");
  });

  it("get_case accepts lower case and says not enough information for unknown IDs", async () => {
    expect((await call("get_case", { case_id: "26h1018" })).json.estimate.status).toBe("ready");
    const missing = await call("get_case", { case_id: "26H9999" });
    expect(missing.text).toMatch(/not enough information/i);
    expect(missing.text).toMatch(/26H9999/);
  });

  it("list_alerts sees the trigger the moment the dashboard fires it", async () => {
    expect((await call("list_alerts")).json.alerts).toHaveLength(3);
    await api.post("/api/sim/basket-failure");
    const { json } = await call("list_alerts", { kind: "basket_failure" });
    expect(json.alerts).toHaveLength(1);
    expect(json.alerts[0].slideIds).toHaveLength(20);
    expect(json.alerts[0].caseIds).toHaveLength(10);
    expect((await call("get_case", { case_id: "26H1005" })).json.estimate.readyAt).toBe("Day 1 12:55");
  });

  it("list_alerts filters by case", async () => {
    const { json } = await call("list_alerts", { case_id: "26H1015" });
    expect(json.alerts.map((a: { kind: string }) => a.kind)).toEqual(["scan_gap"]);
  });

  it("cases_delayed returns holds and says target comparison unavailable", async () => {
    const all = await call("cases_delayed");
    expect(all.json.note).toBe("target comparison unavailable");
    expect(all.json.cases.map((c: { caseId: string }) => c.caseId).sort()).toEqual(["26H1003", "26H1004", "26H1015"]);
    const screening = await call("cases_delayed", { programme: "screening" });
    expect(screening.json.cases).toEqual([]);
    expect(screening.json.note).toBe("target comparison unavailable");
    expect(screening.json.screeningCasesTracked).toBe(143);
  });

  it("cases_delayed also lists urgent cases by recorded priority, without claiming a delay", async () => {
    const { json } = await call("cases_delayed");
    expect(json.urgentWatchList.cases).toHaveLength(15);
    expect(json.urgentWatchList.note).toMatch(/recorded priority/i);
    const u = json.urgentWatchList.cases.find((c: { caseId: string }) => c.caseId === "26H2345");
    expect(u).toMatchObject({ recordedStage: "Awaiting processor or processing", handoffEstimate: "Day 2 12:21", alertIds: [] });
  });

  it("every tool output is safe: no overclaims, no workbook equipment names, simulated flag", async () => {
    await api.post("/api/sim/basket-failure");
    const outputs = [
      await call("get_case", { case_id: "26H1003" }),
      await call("get_case", { case_id: "26H1015" }),
      await call("get_case", { case_id: "26H2345" }),
      await call("list_alerts"),
      await call("cases_delayed"),
      await call("cases_delayed", { programme: "screening" }),
    ];
    for (const o of outputs) {
      expect(findOverclaims(o.text)).toEqual([]);
      expect(o.text).not.toMatch(/Pegasus|Logos|Prisma /);
      expect(o.json.dataNote).toMatch(/simulated/i);
    }
  });

  it("tools never mutate state", async () => {
    const before = api.state.version;
    await call("get_case", { case_id: "26H1005" });
    await call("list_alerts");
    await call("cases_delayed");
    expect(api.state.version).toBe(before);
    expect(api.state.triggerFired).toBe(false);
  });

  it("reports an unreachable API as an error instead of guessing", async () => {
    const server = createMeridianMcp(async () => {
      throw new Error("ECONNREFUSED");
    });
    const [a, b] = InMemoryTransport.createLinkedPair();
    await server.connect(a);
    const c = new Client({ name: "t", version: "0" });
    await c.connect(b);
    const res = await c.callTool({ name: "list_alerts", arguments: {} });
    expect(res.isError).toBe(true);
    expect(JSON.stringify(res.content)).toMatch(/not reachable/i);
  });
});
