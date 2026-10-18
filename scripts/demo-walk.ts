// Walks the demo contract (master prompt v8) against the running dev server, asserting the
// key text and numbers and saving docs/screenshots/demo-<n>.png. Usage: npm run demo:walk
// Requires `npm run dev` (API :8787, web :5173). Uses the installed Chrome (no browser download).
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { chromium, type Page } from "playwright";

const BASE = process.env.DEMO_URL ?? "http://localhost:5173";
const API = process.env.MERIDIAN_API_URL ?? "http://localhost:8787";
const OUT = "docs/screenshots";
const ROOT = fileURLToPath(new URL("..", import.meta.url));

type Beat = { n: number; name: string; run: (page: Page) => Promise<void> };
const results: { n: number; name: string; ok: boolean | "pending"; note?: string }[] = [];

function check(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}
const text = async (page: Page) => (await page.locator("main").innerText()).replace(/\s+/g, " ");
const shot = (page: Page, n: number) => page.screenshot({ path: `${OUT}/demo-${n}.png` });

const beats: Beat[] = [
  {
    n: 1,
    name: "Dashboard at 11:30",
    async run(page) {
      await page.goto(`${BASE}/`);
      await page.locator(".flag-card").first().waitFor();
      await page.locator(".dash:not(.waking)").waitFor(); // Motion Pack 5: let the 1.2 s wake-up finish
      await page.waitForTimeout(800); // and the counts settle (NumberFlow, 700 ms)
      const t = await text(page);
      for (const s of ["450", "346 new", "104 backlog", "8 of 450 completed · 2%", "BCSP", "Cervical screening", "No cases received today"]) check(t.includes(s), `dashboard is missing "${s}"`);
      check((await page.locator(".urgent-row").count()) >= 1, "urgent list is empty");
      const flags = await page.locator(".flag-card").allInnerTexts();
      check(flags.length === 1 && flags[0].includes("Microtomy station 4"), `expected exactly one flag at Microtomy station 4, got ${JSON.stringify(flags)}`);
    },
  },
  {
    n: 2,
    name: "Search 26H2345",
    async run(page) {
      await page.goto(`${BASE}/`);
      await page.locator(".case-search.big input").fill("26H2345");
      await page.locator(".case-search.big input").press("Enter");
      await page.waitForURL("**/case/26H2345");
      await page.locator(".case-page").waitFor();
      const t = await text(page);
      check(t.includes("Urgent"), "26H2345 is not shown as urgent");
      check(/Ready since Day 1 09:30/.test(t), "26H2345 is not ready at 09:30");
      check((await page.locator(".visited li").count()) >= 5, "station journey has fewer than 5 stations");
    },
  },
  {
    n: 3,
    name: "Simulation play to 11:30",
    async run(page) {
      await page.goto(`${BASE}/simulation`);
      const play = page.locator("[data-testid=sim-play]");
      await play.waitFor({ timeout: 10_000 });
      await play.click();
      const started = Date.now();
      await page.locator("[data-testid=sim-clock][data-state=playing]").waitFor({ timeout: 5_000 });
      await page.locator("[data-testid=sim-clock][data-state=ended]", { hasText: "Day 1 11:30" }).waitFor({ timeout: 60_000 });
      const secs = (Date.now() - started) / 1000;
      check(secs > 30 && secs < 50, `playback took ${secs.toFixed(1)} s (expected about 40 s)`);
      check((await page.locator("[data-node=stainer] .sim-flag").count()) === 1, "stainer incident marker missing at 11:30");
      await page.locator(".sim-end a").click();
      await page.locator(".flag-card").first().waitFor({ timeout: 10_000 });
      check((await page.locator(".flag-card").count()) === 1, "dashboard flag is not there after the playback");
      check((await page.locator(".flag-card", { hasText: "Microtomy station 4" }).count()) === 1, "the flag after playback is not 26H1004 at Microtomy station 4");
    },
  },
  {
    n: 4,
    name: "Double-click the flag → 26H1004",
    async run(page) {
      await page.goto(`${BASE}/`);
      await page.locator(".flag-card").first().dblclick();
      await page.waitForURL("**/incident/**");
      const t = await text(page);
      for (const s of ["Microtomy station 4", "1 of 3", "Suggested check", "Evidence"]) check(t.includes(s), `incident page is missing "${s}"`);
      check(await page.locator(".btn-ack").isVisible(), "no Acknowledge button");
    },
  },
  {
    n: 5,
    name: "Acknowledge → flag gone, still open",
    async run(page) {
      await page.locator(".btn-ack").click();
      await page.locator(".alert-state.big", { hasText: "Acknowledged — awaiting check" }).waitFor();
      await page.goto(`${BASE}/`);
      await page.locator(".flag-none").waitFor();
      check((await page.locator(".flag-card").count()) === 0, "flag still on the dashboard");
      await page.goto(`${BASE}/incidents`);
      const row = page.locator(".incidents-table tbody tr", { hasText: "26H1004" });
      check((await row.innerText()).includes("Acknowledged — awaiting check"), "26H1004 not 'Acknowledged — awaiting check' in /incidents");
      check((await page.locator("h2", { hasText: "Open (4)" }).count()) === 1, "26H1004 is not still open");
    },
  },
  {
    n: 6,
    name: "Stainer incident detail",
    async run(page) {
      await page.goto(`${BASE}/incidents`);
      await page.locator(".incidents-table tbody tr", { hasText: "H&E basket failure" }).dblclick();
      await page.waitForURL("**/incident/**");
      const t = await text(page);
      for (const s of ["H&E-BASKET-01", "20 slides", "10 cases", "re-staining · Stain run completes ~11:35", "10:45", "11:04", "11:05"]) check(t.includes(s), `stainer detail is missing "${s}"`);
      const rows = await page.locator(".case-side .case-row").allInnerTexts();
      check(rows.length === 10 && rows.every((r) => /ETA|Ready/.test(r)), `expected 10 affected cases each with status + ETA, got ${rows.length}`);
    },
  },
  {
    n: 7,
    name: "Agent console lights up on an MCP tool call",
    async run(page) {
      await page.goto(`${BASE}/`);
      const client = new Client({ name: "demo-walk", version: "0" });
      await client.connect(new StdioClientTransport({ command: process.execPath, args: [`${ROOT}node_modules/tsx/dist/cli.mjs`, `${ROOT}mcp/src/index.ts`], env: { ...process.env, MERIDIAN_API_URL: API } as Record<string, string>, stderr: "pipe" }));
      await client.callTool({ name: "get_case", arguments: { case_id: "26H1005" } });
      await client.close();
      await page.locator(".agent-row", { hasText: "get_case" }).first().waitFor({ timeout: 10_000 });
    },
  },
  {
    n: 8,
    name: "Reset demo → back to state 1",
    async run(page) {
      await page.locator(".footer button", { hasText: "Reset demo" }).click();
      await page.goto(`${BASE}/`);
      await page.locator(".flag-card", { hasText: "Microtomy station 4" }).waitFor();
      check((await page.locator(".agent-row").count()) === 0, "agent console not cleared");
      check((await text(page)).includes("8 of 450 completed · 2%"), "donut changed");
    },
  },
  {
    n: 9,
    name: "Compare: a LIMS today vs Meridian (26H1004)",
    async run(page) {
      await page.goto(`${BASE}/lims-view`);
      await page.locator(".lims-compare").click();
      await page.waitForURL("**/compare");
      const lims = page.locator("[data-testid=compare-lims] tbody tr");
      await lims.first().waitFor();
      check((await lims.count()) >= 5, "LIMS side shows fewer than 5 events");
      const left = await page.locator(".compare-lims").innerText();
      check(!/Ready|ETA|incident/i.test(left), "LIMS side shows estimates or incidents");
      const right = await page.locator(".compare-meridian").innerText();
      check(right.includes("1 of 3") && right.includes("Microtomy station 4"), "Meridian side is missing the 26H1004 incident");
      check(/ETA unknown|Ready/.test(right), "Meridian side has no handoff time or reason");
      check((await text(page)).includes("Same events. One records what happened; the other shows what's happening."), "caption missing");
    },
  },
];

async function main() {
  mkdirSync(OUT, { recursive: true });
  await fetch(`${API}/api/sim/reset`, { method: "POST" });
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  // FX=all (or FX=1,2,3) walks the demo with Motion Pack effects switched on for this tab.
  if (process.env.FX) {
    await page.goto(`${BASE}/?fx=${process.env.FX}`);
    console.log(`Motion Pack effects on: ${process.env.FX}`);
  }
  // VIZ=all (or VIZ=1,3) walks the demo with Insight visuals switched on for this tab.
  if (process.env.VIZ) {
    await page.goto(`${BASE}/?viz=${process.env.VIZ}`);
    console.log(`Insight visuals on: ${process.env.VIZ}`);
  }
  for (const b of beats) {
    try {
      await b.run(page);
      await shot(page, b.n);
      results.push({ n: b.n, name: b.name, ok: true });
    } catch (e) {
      const pending = (e as { pending?: boolean }).pending;
      results.push({ n: b.n, name: b.name, ok: pending ? "pending" : false, note: (e as Error).message });
      await shot(page, b.n).catch(() => {});
    }
  }
  await browser.close();
  await fetch(`${API}/api/sim/reset`, { method: "POST" });
  for (const r of results) console.log(`${r.ok === true ? "PASS" : r.ok === "pending" ? "PENDING" : "FAIL"}  beat ${r.n}: ${r.name}${r.note ? ` — ${r.note}` : ""}`);
  const failed = results.filter((r) => r.ok === false).length;
  console.log(failed ? `\n${failed} beat(s) failed` : "\nAll implemented beats pass");
  process.exit(failed ? 1 : 0);
}

main();
