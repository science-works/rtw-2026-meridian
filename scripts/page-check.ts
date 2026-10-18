// Loads every demo page in a real browser and fails on errors, a "Not found" page or an empty page.
// Usage: npx tsx scripts/page-check.ts (DEMO_URL defaults to http://localhost:5173)
import { chromium } from "playwright";

const BASE = process.env.DEMO_URL ?? "http://localhost:5173";
const PAGES = ["/", "/simulation", "/simulator", "/incidents", "/case/26H2345", "/lims-view", "/compare", "/how-it-works"];
const browser = await chromium.launch({ channel: "chrome" });
let failed = 0;
for (const path of PAGES) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && !/status of 404/.test(m.text()) && errors.push(m.text()));
  page.on("response", (r) => r.status() >= 400 && !r.url().endsWith("/favicon.ico") && errors.push(`${r.status()} ${r.url()}`));
  await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  const text = await page.locator("main").innerText().catch(() => "");
  const bad = errors.length ? errors[0] : /Not found|Cannot reach|Loading…$/.test(text.trim()) ? "page did not load" : text.trim().length < 40 ? "page is empty" : null;
  console.log(`${bad ? "FAIL" : "PASS"}  ${path}${bad ? ` — ${bad}` : ""}`);
  if (bad) failed++;
  await page.close();
}
await browser.close();
process.exit(failed ? 1 : 0);
