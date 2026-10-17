// P2: the light simulation is a pure function of recorded data and time.
import { beforeAll, describe, expect, it } from "vitest";
import { CLOCK_MINUTES, parseSimTime } from "../../shared/clock";
import { buildTimeline, NODE_TO_CARD, NODES, PLAY_FROM, stateAt } from "../../shared/simulation";
import { computeAlerts } from "../../server/src/domain/alerts";
import { loadData } from "../../server/src/domain/load";
import { computeStations } from "../../server/src/domain/stations";
import type { CellpathData } from "../../shared/types";

let data: CellpathData;
let timeline: ReturnType<typeof buildTimeline>;
beforeAll(() => {
  data = loadData();
  timeline = buildTimeline(data);
});

describe("stateAt(t)", () => {
  it("covers every case, and the board follows Victoria's drawing", () => {
    expect(timeline.cases.size).toBe(450);
    expect(NODES.map((n) => n.label)).toEqual([
      "Samples received", "Cut-up", "Decalcification", "Processor A", "Processor B", "Processor C", "Processor D",
      "Embedder 1", "Embedder 2", "Microtomy queue", "Microtome 1", "Microtome 2", "Microtome 3", "Microtome 4", "Microtome 5", "Microtome 6",
      "Stainer", "Scanner queue", "Scanner 1", "Scanner 2", "IQC", "Cases emitted",
    ]);
  });

  it("stateAt(11:30) equals the server state: every case sits on the station card that holds it", () => {
    const s = stateAt(timeline, CLOCK_MINUTES);
    const cards = computeStations(data, computeAlerts(data));
    for (const [caseId, node] of s.positions) {
      const card = cards.find((c) => c.id === NODE_TO_CARD[node]);
      expect(card?.caseIds, `${caseId} at ${node}`).toContain(caseId);
    }
    expect(s.positions.size).toBe(450);
  });

  it("node counts at 11:30 reconcile with the recorded stages (450 in total)", () => {
    const s = stateAt(timeline, CLOCK_MINUTES);
    expect([...s.counts.values()].reduce((a, b) => a + b, 0)).toBe(450);
    expect(s.counts.get("emitted")).toBe(8);
    expect(s.counts.get("stainer")).toBe(15);
    expect(s.counts.get("decal")).toBe(20);
  });

  it("is a pure function: the same t gives the same state; earlier t has fewer cases received", () => {
    const t = parseSimTime("Day 1 08:00");
    expect([...stateAt(timeline, t).positions]).toEqual([...stateAt(timeline, t).positions]);
    expect(stateAt(timeline, PLAY_FROM).positions.size).toBeLessThan(stateAt(timeline, t).positions.size);
  });

  it("the microtomy queue builds over the morning", () => {
    const at = (s: string) => stateAt(timeline, parseSimTime(s)).counts.get("microtomy-queue") ?? 0;
    expect(at("Day 0 06:30")).toBeLessThan(at("Day 1 11:30"));
  });

  it("the stainer incident appears at 10:45 and 26H1004's levels incident at 10:40, from recorded events", () => {
    expect(stateAt(timeline, parseSimTime("Day 1 10:44")).incidents).toEqual(["microtome-4"]);
    expect(stateAt(timeline, parseSimTime("Day 1 10:45")).incidents.sort()).toEqual(["microtome-4", "stainer"]);
    expect(stateAt(timeline, parseSimTime("Day 1 10:39")).incidents).toEqual([]);
  });

  it("26H2345 (urgent) is emitted at 09:30, not before", () => {
    expect(stateAt(timeline, parseSimTime("Day 1 09:29")).positions.get("26H2345")).not.toBe("emitted");
    expect(stateAt(timeline, parseSimTime("Day 1 09:30")).positions.get("26H2345")).toBe("emitted");
  });
});

describe("GET /api/simulation and station history", () => {
  it("the payload replays to the same 11:30 state as the server (no second source of truth)", async () => {
    const { freshApp } = await import("../api/helpers");
    const { timelineFrom } = await import("../../shared/simulation");
    const { get } = freshApp();
    const body = (await get<import("../../shared/types").SimulationResponse>("/api/simulation")).body;
    expect(body.from).toBe(PLAY_FROM);
    expect(body.to).toBe(CLOCK_MINUTES);
    const replay = stateAt(timelineFrom(body), CLOCK_MINUTES);
    expect([...replay.positions]).toEqual([...stateAt(timeline, CLOCK_MINUTES).positions]);
  });

  it("station cards list recorded work there, newest first; staff only from recorded initials", () => {
    const cards = computeStations(data, computeAlerts(data));
    const m4 = cards.find((c) => c.id === "microtomy-4")!;
    expect(m4.worked?.some((w) => w.caseId === "26H1004")).toBe(true);
    const times = (m4.worked ?? []).map((w) => parseSimTime(w.at));
    expect(times).toEqual([...times].sort((a, b) => b - a));
    for (const c of cards) for (const i of c.initials ?? []) expect(data.events.find((e) => e.eventId === i.eventId)?.initials).toBe(i.initials);
  });
});

describe("seriesFor (section pages: cleared over time)", () => {
  it("ends at the section's recorded counts and never decreases for cleared", async () => {
    const { seriesFor } = await import("../../shared/simulation");
    const all = data.cases.map((c) => c.caseId);
    const s = seriesFor(timeline, all, PLAY_FROM, CLOCK_MINUTES);
    expect(s.at(-1)).toEqual({ t: CLOCK_MINUTES, received: 450, cleared: 8 });
    for (let i = 1; i < s.length; i++) expect(s[i].cleared).toBeGreaterThanOrEqual(s[i - 1].cleared);
    const urgent = data.cases.filter((c) => c.priority === "Urgent").map((c) => c.caseId);
    const u = seriesFor(timeline, urgent, PLAY_FROM, CLOCK_MINUTES);
    expect(u.find((p) => p.t >= parseSimTime("Day 1 09:30"))!.cleared).toBeGreaterThanOrEqual(1); // 26H2345 ready at 09:30
  });
});
