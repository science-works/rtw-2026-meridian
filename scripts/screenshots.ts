// Screenshots every page at both projector sizes into docs/screenshots/v8-<name>-<w>.png
// and reports any horizontal overflow. Usage: npm run screenshots (needs npm run dev).
import { mkdirSync } from "node:fs";
import { chromium } from "playwright";

const BASE = process.env.DEMO_URL ?? "http://localhost:5173";
const PAGES: [string, string][] = [
  ["dashboard", "/"],
  ["case-26H2345", "/case/26H2345"],
  ["case-26H1003", "/case/26H1003"],
  ["case-26H1004", "/case/26H1004"],
  ["case-26H1005", "/case/26H1005"],
  ["case-26H1016", "/case/26H1016"],
  ["incidents", "/incidents"],
  ["incident-26H1004", `/incident/${encodeURIComponent("protocol_mismatch:26H1004/A1")}`],
  ["incident-stainer", `/incident/${encodeURIComponent("basket_failure:H&E-BASKET-01")}`],
  ["simulation", "/simulation"],
  ["simulator", "/simulator"],
  ["station-stainer", "/station/stainer-1"],
  ["station-embedding-1", "/station/embedding-1"],
  ["section-urgent", "/section/urgent"],
  ["section-bcsp", "/section/bcsp"],
  ["section-cytopathology", "/section/cytopathology"],
  ["lims-view", "/lims-view"],
];

async function main() {
  mkdirSync("docs/screenshots", { recursive: true });
  await fetch("http://localhost:8787/api/sim/reset", { method: "POST" });
  const browser = await chromium.launch({ channel: "chrome" });
  const problems: string[] = [];
  for (const [w, h] of [[1440, 900], [1280, 720]]) {
    const page = await browser.newPage({ viewport: { width: w, height: h } });
    for (const [name, path] of PAGES) {
      await page.goto(`${BASE}${path}`);
      await page.waitForTimeout(1200);
      const sw = await page.evaluate(() => document.documentElement.scrollWidth);
      if (sw > w) problems.push(`${name} @${w}: horizontal overflow ${sw}px`);
      await page.screenshot({ path: `docs/screenshots/v8-${name}-${w}.png` });
    }
    await page.close();
  }
  await browser.close();
  console.log(`${PAGES.length * 2} screenshots saved to docs/screenshots/`);
  console.log(problems.length ? problems.join("\n") : "No horizontal overflow on any page at 1440×900 or 1280×720");
}

main();
