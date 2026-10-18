// Measures layout shift (CLS) and largest contentful paint per type set, against a running build
// (npm run demo:serve). Usage: DEMO_URL=http://localhost:5173 npx tsx scripts/layout-shift.ts
import { chromium } from "playwright";
const BASE = process.env.DEMO_URL ?? "http://localhost:5173";
const browser = await chromium.launch({ channel: "chrome" });
for (const t of ["default", "editorial", "instrument", "clinical"]) {
  for (const path of ["/", "/case/26H2345", "/incident/protocol_mismatch%3A26H1004%2FA1"]) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await page.addInitScript(() => {
      (window as any).__cls = 0; (window as any).__lcp = 0;
      new PerformanceObserver((l) => { for (const e of l.getEntries() as any) if (!e.hadRecentInput) (window as any).__cls += e.value; }).observe({ type: "layout-shift", buffered: true });
      new PerformanceObserver((l) => { for (const e of l.getEntries()) (window as any).__lcp = e.startTime; }).observe({ type: "largest-contentful-paint", buffered: true });
    });
    await page.goto(`${BASE}${path}?type=${t}&fx=none&viz=default`, { waitUntil: "networkidle" });
    await page.waitForTimeout(2500);
    const r = await page.evaluate(() => ({ cls: (window as any).__cls, lcp: (window as any).__lcp, fonts: [...document.fonts].filter((f) => f.status === "loaded").map((f) => f.family).join(",") }));
    console.log(`${t.padEnd(10)} ${path.slice(0, 18).padEnd(18)} CLS ${r.cls.toFixed(3)}  LCP ${Math.round(r.lcp)} ms  ${r.fonts}`);
    await ctx.close();
  }
}
await browser.close();
