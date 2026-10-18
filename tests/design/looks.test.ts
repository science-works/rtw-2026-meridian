// Design Lab looks: each keeps Victoria's colour rules and the contrast floor, and looks.css mirrors looks.ts.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { color } from "../../web/src/theme/tokens";
import { looks, type LookId } from "../../web/src/theme/looks";

const css = readFileSync("web/src/looks.css", "utf8");
const lum = (h: string) => {
  const c = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const contrast = (a: string, b: string) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};
const hue = (h: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  if (!d) return 0;
  const raw = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return (raw * 60 + 360) % 360;
};

describe.each(Object.keys(looks) as LookId[])("look %s", (id) => {
  const L = looks[id];
  it("body text is at least 7:1 on the page and on cards", () => {
    for (const fg of [L.ink, L.muted]) for (const bg of [L.bg, L.card, L.card2]) expect(contrast(fg, bg)).toBeGreaterThanOrEqual(7);
  });
  it("coloured text (accent, urgent, incident, BCSP, CSP, progress) is at least 4.5:1 on the page and on cards", () => {
    for (const fg of [L.accent, L.urgent, L.attention, L.bcsp, L.csp, L.progress]) for (const bg of [L.bg, L.card]) expect(contrast(fg, bg)).toBeGreaterThanOrEqual(4.5);
  });
  it("keeps the colour meanings: red urgent, warm orange incident, purple BCSP, green CSP", () => {
    expect(hue(L.urgent) < 10 || hue(L.urgent) > 350).toBe(true);
    expect(hue(L.attention)).toBeGreaterThan(30);
    expect(hue(L.attention)).toBeLessThan(45);
    expect(hue(L.bcsp)).toBeGreaterThan(250);
    expect(hue(L.bcsp)).toBeLessThan(290);
    expect(hue(L.csp)).toBeGreaterThan(140);
    expect(hue(L.csp)).toBeLessThan(170);
    expect(L.attention).toBe(color.attention);
  });
  it("looks.css sets the same values under html[data-look]", () => {
    const block = css.slice(css.indexOf(`html[data-look="${id}"] {`));
    const vars = block.slice(0, block.indexOf("}"));
    for (const [k, v] of Object.entries(L)) {
      if (k === "name") continue;
      const name = `--${k.replace(/[A-Z0-9]/g, (m) => `-${m.toLowerCase()}`).replace("card2", "card-2")}`;
      expect(vars, `${id} ${name}`).toContain(`${name}: ${v};`);
    }
  });
});

describe("looks report", () => {
  it("prints contrast per look", () => {
    for (const [id, L] of Object.entries(looks)) {
      const r = (fg: string) => Math.min(contrast(fg, L.bg), contrast(fg, L.card)).toFixed(1);
      console.log(`${id} ${L.name}: ink ${r(L.ink)} · muted ${r(L.muted)} · accent ${r(L.accent)} · urgent ${r(L.urgent)} · incident ${r(L.attention)} · BCSP ${r(L.bcsp)} · CSP ${r(L.csp)}`);
    }
    const r = (fg: string) => Math.min(contrast(fg, color.bg), contrast(fg, color.card)).toFixed(1);
    console.log(`Default: ink ${r(color.ink)} · muted ${r(color.muted)} · accent ${r(color.accent)} · urgent ${r(color.urgent)} · incident ${r(color.attention)} · BCSP ${r(color.bcsp)} · CSP ${r(color.csp)}`);
  });
});

describe("looks never drop a colour cue", () => {
  it("re-asserts the urgent ring, BCSP/CSP tile edges and the incident border for every look", () => {
    for (const rule of [
      "html[data-look] .urgent-panel { border: 2px solid var(--urgent); }",
      "html[data-look] .tile-bcsp { border-top: 4px solid var(--bcsp); }",
      "html[data-look] .tile-csp { border-top: 4px solid var(--csp); }",
      "html[data-look] .tile-incidents { border-top: 4px solid var(--attention); }",
      "html[data-look] .flag-card { border: 1px solid var(--attention); }",
    ])
      expect(css).toContain(rule);
    // The re-assertions come last, so no look-specific border rule can override them.
    expect(css.lastIndexOf("html[data-look] .urgent-panel")).toBeGreaterThan(css.lastIndexOf('html[data-look="C"]'));
  });
});
