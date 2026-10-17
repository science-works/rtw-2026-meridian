// Enforces the testable rules in docs/DESIGN_RULES.md.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { color, cssVar, space } from "../../web/src/theme/tokens";

const css = readFileSync("web/src/styles.css", "utf8");
const files = (dir: string): string[] => readdirSync(dir).flatMap((f) => (statSync(join(dir, f)).isDirectory() ? files(join(dir, f)) : [join(dir, f)]));
const tsx = files("web/src").filter((f) => f.endsWith(".tsx"));

const lum = (h: string) => {
  const c = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const contrast = (a: string, b: string) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

describe("design rules", () => {
  it("1. every colour token is a CSS variable with the same value", () => {
    for (const [k, v] of Object.entries(color)) expect(css).toContain(`${cssVar(k as keyof typeof color)}: ${v};`);
  });

  it("4. text colours are at least 4.5:1 on the dark surfaces and the light simulation board", () => {
    for (const fg of [color.ink, color.muted, color.accent, color.urgent, color.attention, color.progress, color.bcsp, color.csp]) {
      for (const bg of [color.bg, color.card]) expect(contrast(fg, bg)).toBeGreaterThanOrEqual(4.5);
    }
    for (const fg of [color.simInk, color.simMuted]) expect(contrast(fg, color.simCanvas)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(color.onLight, color.attention)).toBeGreaterThanOrEqual(4.5); // the "!" glyph on the incident marker
  });

  it("3. red is for urgent cases only; incidents use the one attention tone; no other severity colours", () => {
    expect(css.toLowerCase()).not.toMatch(/#ffd06b|#c98a1b|amber|--attn|--alert/);
    const rules = [...css.matchAll(/([^{}]+)\{([^}]*var\(--urgent\)[^}]*)\}/g)].map((m) => m[1].trim());
    expect(rules.length).toBeGreaterThan(0);
    for (const sel of rules) expect(sel, sel).toMatch(/urgent/);
  });

  it("6. no text below 14px", () => {
    const sizes = [...css.matchAll(/font-size:\s*(\d+)px/g)].map((m) => Number(m[1]));
    expect(sizes.filter((s) => s < 14)).toEqual([]);
  });

  it("10. the spacing scale is the documented one", () => {
    expect([...space]).toEqual([4, 8, 12, 16, 24, 32, 48]);
  });

  it("16. no emoji in the UI source", () => {
    for (const f of tsx) expect(readFileSync(f, "utf8"), f).not.toMatch(/\p{Extended_Pictographic}/u);
  });

  it("21. reduced motion switches every animation off", () => {
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)\s*{\s*\*, \*::before, \*::after { animation: none !important; transition: none !important; }/);
  });
});
