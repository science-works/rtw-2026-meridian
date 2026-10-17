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
  const server = createMeridianMcp((path) => api.app.request(path));
  const [a, b] = InMemoryTransport.createLinkedPair();
  await server.connect(a);
  client = new Client({ name: "test", version: "0" });
  await client.connect(b);
});

async function brief() {
  const res = await client.getPrompt({ name: "shift_handover", arguments: { mode: "brief" } });
  const msg = res.messages[0];
  expect(msg.role).toBe("user");
  return (msg.content as { type: string; text: string }).text;
}

const section = (text: string, heading: string) => {
  const start = text.indexOf(`## ${heading}`);
  expect(start).toBeGreaterThanOrEqual(0);
  const next = text.indexOf("\n## ", start + 3);
  return text.slice(start, next < 0 ? undefined : next);
};

describe("C2b: shift_handover in agent mode (default): the agent makes the tool calls itself", () => {
  async function agentPrompt(args: Record<string, string> = {}) {
    const res = await client.getPrompt({ name: "shift_handover", arguments: args });
    return (res.messages[0].content as { type: string; text: string }).text;
  }

  it("tells the agent to call list_alerts, then get_case per affected case, then cases_delayed, in that order", async () => {
    const t = await agentPrompt();
    const a = t.indexOf("list_alerts");
    const g = t.indexOf("get_case");
    const d = t.indexOf("cases_delayed");
    expect(a).toBeGreaterThanOrEqual(0);
    expect(g).toBeGreaterThan(a);
    expect(d).toBeGreaterThan(g);
    expect(t).toMatch(/for each affected case/i);
  });

  it("asks for the five sections and the safety rules", async () => {
    const t = await agentPrompt();
    for (const h of ["Open alerts", "Cases at risk", "Things we can't know yet", "Suggested staff checks", "Not in scope"]) expect(t).toContain(h);
    expect(t).toMatch(/evidence event IDs/i);
    expect(t).toMatch(/not enough information/i);
    expect(t).toMatch(/invent nothing/i);
    expect(t).toMatch(/no clinical advice/i);
  });

  it("passes a focus through when given", async () => {
    expect(await agentPrompt({ focus: "26H1005" })).toMatch(/Focus: 26H1005/);
  });

  it("does not call the API itself in agent mode (the agent's own calls are the evidence)", async () => {
    let calls = 0;
    const counting = createMeridianMcp((path) => {
      calls++;
      return api.app.request(path);
    });
    const [x, y] = InMemoryTransport.createLinkedPair();
    await counting.connect(x);
    const c = new Client({ name: "count", version: "0" });
    await c.connect(y);
    await c.getPrompt({ name: "shift_handover", arguments: {} });
    expect(calls).toBe(0);
  });
});

describe("meridian://overview resource", () => {
  it("returns the live overview", async () => {
    const { resources } = await client.listResources();
    expect(resources.map((r) => r.uri)).toContain("meridian://overview");
    const r = await client.readResource({ uri: "meridian://overview" });
    const body = JSON.parse((r.contents[0] as { text: string }).text);
    expect(body).toMatchObject({ total: 450, backlog: 104, today: 346 });
  });
});

describe("C2b: shift_handover in brief mode (deterministic, for the Inspector)", () => {
  it("is listed as a prompt", async () => {
    const { prompts } = await client.listPrompts();
    expect(prompts.map((p) => p.name)).toContain("shift_handover");
    expect(prompts.find((p) => p.name === "shift_handover")!.description).toMatch(/read-only/i);
  });

  it("has every section the incoming shift needs", async () => {
    const t = await brief();
    for (const h of ["Open alerts", "Cases at risk", "Unknowns", "Urgent watch list", "Staff checks", "Targets", "Not in scope"]) section(t, h);
    expect(t).toMatch(/simulated/i);
    expect(t).toMatch(/list_alerts → get_case .* → cases_delayed/);
  });

  it("before the trigger: three alerts with their evidence IDs and checks", async () => {
    const t = await brief();
    const alerts = section(t, "Open alerts");
    expect(alerts).toMatch(/Open alerts \(3\)/);
    for (const id of ["EV-01121", "EV-01230", "EV-01099"]) expect(alerts).toContain(id);
    expect(section(t, "Staff checks")).toContain("Missing scan event; check the slide location or scan record.");
    expect(section(t, "Targets")).toContain("target comparison unavailable");
  });

  it("after the dashboard trigger: the stain failure, its 10 cases and their new estimates", async () => {
    await api.post("/api/sim/basket-failure");
    const t = await brief();
    expect(section(t, "Open alerts")).toMatch(/Open alerts \(4\)/);
    expect(section(t, "Open alerts")).toContain("EV-01215");
    const risk = section(t, "Cases at risk");
    expect(risk).toMatch(/Cases at risk \(13\)/);
    expect(risk).toMatch(/26H1005 .*Day 1 12:55/);
  });

  it("lists unknowns with their reasons instead of guessing", async () => {
    const u = section(await brief(), "Unknowns");
    expect(u).toMatch(/26H1003: No reliable whole-case estimate/);
    expect(u).toMatch(/20 × Decalcification has no configured duration/);
  });

  it("keeps urgent cases visible by recorded priority only", async () => {
    const w = section(await brief(), "Urgent watch list");
    expect(w).toMatch(/not a delay claim/i);
    expect(w).toMatch(/26H2345 .*Day 2 12:21/);
  });

  it("is safe: no overclaims outside the scope line, no workbook names, no mutation", async () => {
    await api.post("/api/sim/basket-failure");
    const version = api.state.version;
    const t = await brief();
    const body = t.slice(0, t.indexOf("## Not in scope"));
    expect(findOverclaims(body)).toEqual([]);
    expect(t).not.toMatch(/Pegasus|Logos|Prisma /);
    expect(section(t, "Not in scope")).toMatch(/diagnosis.*reporting.*screening/i);
    expect(api.state.version).toBe(version);
  });
});
