// /presenter reads pitch/SCRIPT.md verbatim and splits it into speaker cards.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseScript } from "../../shared/script";

const md = readFileSync(new URL("../../pitch/SCRIPT.md", import.meta.url), "utf8");
const s = parseScript(md);

describe("parseScript(pitch/SCRIPT.md)", () => {
  it("keeps every spoken line verbatim and in order", () => {
    const spoken = s.cards.flatMap((c) => c.lines);
    for (const l of spoken) expect(md).toContain(l);
    const positions = spoken.map((l) => md.indexOf(l));
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
    expect(spoken.join(" ")).toContain("I run a histology lab.");
    expect(spoken.at(-1)).toContain("what's about to go wrong");
  });

  it("splits into speaker beats with their stage cues", () => {
    expect(s.cards[0]).toMatchObject({ speaker: "Victoria", cue: "Dashboard, no clicks", window: "0:00–0:25" });
    expect(s.cards.some((c) => c.speaker === "Victoria" && c.cue === "Simulation → Play")).toBe(true);
    expect(s.cards.some((c) => c.speaker === "Victoria" && c.cue === "presses Acknowledge")).toBe(true);
    expect(s.cards.at(-1)).toMatchObject({ section: "CLOSE", speaker: "Victoria" });
    expect(s.never[0]).toMatch(/^Never say:/);
    for (const c of s.cards) expect(c.speaker).toBeDefined();
  });
});

describe("GET /api/pitch", () => {
  it("serves pitch/SCRIPT.md byte for byte", async () => {
    const { freshApp } = await import("../api/helpers");
    const r = await freshApp().get<{ markdown: string }>("/api/pitch");
    expect(r.status).toBe(200);
    expect(r.body.markdown).toBe(md);
  });
});

describe("routeForCue", () => {
  it("opens the named screen and leaves live actions to the presenter", async () => {
    const { routeForCue } = await import("../../shared/script");
    expect(s.cards.map((c) => routeForCue(c.cue))).toEqual(["/", "/lims-view", "/", null, "/simulation", null, null, null, "/incidents", null, null, null, null]);
  });
});

describe("presentedCards", () => {
  it("adds the compare card between the old way and the reinvention, without touching the script's cards", async () => {
    const { presentedCards, routeForCue } = await import("../../shared/script");
    const cards = presentedCards(s.cards);
    expect(cards).toHaveLength(s.cards.length + 1);
    const i = cards.findIndex((c) => c.extra);
    expect(cards[i - 1].section).toMatch(/^2 ·/);
    expect(cards[i + 1].section).toMatch(/^3 ·/);
    expect(cards[i].lines).toEqual([]);
    expect(routeForCue(cards[i].cue)).toBe("/compare");
    expect(cards.filter((c) => !c.extra)).toEqual(s.cards);
  });
});
