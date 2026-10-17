// Spec Screen B: the lab-flow map. Every card's contents come from recorded data.
import { beforeAll, describe, expect, it } from "vitest";
import { computeAlerts } from "../../server/src/domain/alerts";
import { splitStaged } from "../../server/src/domain/incident";
import { loadData } from "../../server/src/domain/load";
import { computeStations, whyWaiting } from "../../server/src/domain/stations";
import { fireBasketFailure } from "../../server/src/domain/trigger";
import type { CellpathData, EventRecord, StationCard } from "../../shared/types";

let log: CellpathData;
let staged: EventRecord[];
let before: StationCard[];
const card = (cards: StationCard[], id: string) => cards.find((c) => c.id === id)!;

beforeAll(() => {
  ({ data: log, staged } = splitStaged(loadData()));
  before = computeStations(log, computeAlerts(log));
});

describe("equipment set (spec §3, §10)", () => {
  it("shows exactly 4 processors, 2 embedding stations, 6 microtomy stations, 1 H&E stainer, 2 scanners, 1 IQC workstation", () => {
    const equipment = before.filter((c) => c.kind !== "zone" && c.kind !== "queue").map((c) => c.label);
    expect(equipment).toEqual([
      "Processor A", "Processor B", "Processor C", "Processor D",
      "Embedding station 1", "Embedding station 2",
      "Microtomy station 1", "Microtomy station 2", "Microtomy station 3", "Microtomy station 4", "Microtomy station 5", "Microtomy station 6",
      "H&E auto-stainer 1",
      "Digital scanner 1", "Digital scanner 2",
      "IQC workstation 1",
    ]);
    expect(JSON.stringify(before)).not.toMatch(/Stainer 1\b|Scanner [34]|Digital scanner [34]/);
  });

  it("has the flow zones in order, with decalcification as a holding zone before the processors", () => {
    expect(before.map((c) => c.zone).filter((z, i, a) => a.indexOf(z) === i)).toEqual([
      "Reception / dissection", "Decalcification holding", "Processors", "Embedding", "Microtomy", "H&E", "Scanning", "IQC", "Pathologist handoff",
    ]);
  });

  it("every case is in exactly one zone by its recorded stage (450 in total)", () => {
    const byStage = before.filter((c) => c.kind !== "zone" || c.id !== "handoff").length;
    expect(byStage).toBeGreaterThan(0);
    const counted = new Map<string, number>();
    for (const c of before) for (const id of c.caseIds) counted.set(id, (counted.get(id) ?? 0) + 1);
    // 26H1003 appears twice on purpose: F1 at reception, A1–E1 in Processor D.
    expect(counted.size).toBe(450);
    expect([...counted].filter(([, n]) => n > 1).map(([id]) => id)).toEqual(["26H1003"]);
  });
});

describe("cards", () => {
  it("Processor D holds 26H1003's blocks A1–E1 with output expected 12:00–13:00 (rule source shown)", () => {
    const d = card(before, "processor-d");
    expect(d.items).toEqual(["26H1003 · A1–E1"]);
    expect(d.blocks).toBe(5);
    expect(d.state).toMatch(/12:00–13:00/);
    expect(d.nextMilestone?.rule).toMatch(/Timing Rules: Processor D/);
    expect(d.load).toMatch(/capacity not specified/i);
  });

  it("processors A–C hold the processing-stage cases by recorded processor", () => {
    expect([card(before, "processor-a").caseIds.length, card(before, "processor-b").caseIds.length, card(before, "processor-c").caseIds.length]).toEqual([98, 5, 48]);
  });

  it("embedding stations show recorded stations and fictional initials (traceability only)", () => {
    const e1 = card(before, "embedding-1");
    const e2 = card(before, "embedding-2");
    expect(e1.caseIds.length + e2.caseIds.length).toBe(29);
    expect(new Set(e1.initials!.map((x) => x.initials))).toEqual(new Set(["AA"]));
    expect(new Set(e2.initials!.map((x) => x.initials))).toEqual(new Set(["BB"]));
  });

  it("microtomy: 26H1004 at station 4; cases without a recorded station sit in the microtomy queue", () => {
    expect(card(before, "microtomy-4").caseIds).toContain("26H1004");
    const q = card(before, "microtomy-queue");
    expect(q.kind).toBe("queue");
    const atStations = before.filter((c) => c.id.startsWith("microtomy-") && c.id !== "microtomy-queue").flatMap((c) => c.caseIds);
    expect(q.caseIds.length + atStations.length).toBe(139);
  });

  it("H&E auto-stainer: 3 boxes × 3 baskets; Box 1 / Basket 1 is H&E-BASKET-01 with 20 slides / 10 cases", () => {
    const s = card(before, "stainer-1");
    expect(s.baskets).toHaveLength(9);
    const b1 = s.baskets!.find((b) => b.box === 1 && b.basket === 1)!;
    expect(b1).toMatchObject({ basketId: "H&E-BASKET-01", slides: 20 });
    expect(b1.caseIds).toHaveLength(10);
    expect(b1.state).toBe("Loaded 10:30");
    expect(s.load).toBe("20 of 180 slide slots recorded in baskets");
    expect(s.caseIds).toHaveLength(15);
  });

  it("Basket 1 goes Run failed → Acknowledged → Repeat stain in progress as the incident is replayed", () => {
    const upTo = (id: string) => ({ ...log, events: [...log.events, ...staged.slice(0, staged.findIndex((e) => e.eventId === id) + 1)] });
    const state = (d: CellpathData) => computeStations(d, computeAlerts(d)).find((c) => c.id === "stainer-1")!.baskets!.find((b) => b.basket === 1 && b.box === 1)!.state;
    expect(state(upTo("EV-01250"))).toBe("Run failed 10:45");
    expect(state(upTo("EV-01255"))).toBe("Acknowledged 10:47");
    expect(state(fireBasketFailure(log, staged))).toBe("Repeat stain in progress (started 11:05)");
  });

  it("scanners: two units with 100 slots each; scan-stage cases without a recorded unit wait in the scanner queue", () => {
    for (const id of ["scanner-1", "scanner-2"]) expect(card(before, id).load).toMatch(/100 slide slots/);
    const q = card(before, "scanner-queue");
    expect(q.caseIds).toHaveLength(8);
    expect(q.nextMilestone?.text).toMatch(/2 min per slide/);
  });

  it("IQC workstation 1 and the handoff endpoint (physical tray and digital send shown separately)", () => {
    expect(card(before, "iqc-1").caseIds).toHaveLength(5);
    const h = card(before, "handoff");
    expect(h.caseIds).toHaveLength(8);
    expect(h.handoff).toEqual({ digital: expect.stringMatching(/recorded/i), physical: expect.stringMatching(/not recorded separately/i) });
  });

  it("station latest events are real station activity, not the 11:30 snapshot rows", () => {
    for (const c of before) if (c.latestEvent) expect(c.latestEvent.text).not.toMatch(/^Stage at Tuesday 11:30/);
    expect(card(before, "stainer-1").latestEvent?.at).toBe("Day 1 10:30");
  });

  it("each equipment card has a latest event time where one is recorded", () => {
    expect(card(before, "processor-d").latestEvent?.at).toBe("Day 0 16:30");
    expect(card(before, "embedding-1").latestEvent?.at).toMatch(/^Day 1/);
  });

  it("decalcification is normal holding work: 20 cases, no ETA invented", () => {
    const z = card(before, "decal");
    expect(z.caseIds).toHaveLength(20);
    expect(z.nextMilestone?.text).toMatch(/ready for processing/i);
    expect(z.nextMilestone?.at).toBeUndefined();
  });
});

describe("why is it waiting? (spec Screen C)", () => {
  it("names the latest event and the missing next event", () => {
    const full = loadData();
    expect(whyWaiting(full, "26H1004")).toMatchObject({ latest: { eventId: "EV-01211" }, missing: expect.stringMatching(/levels 2.?3/i) });
    expect(whyWaiting(full, "26H1003").missing).toMatch(/F1/);
    expect(whyWaiting(full, "26H1015").missing).toMatch(/scan-complete/i);
    expect(whyWaiting(full, "26H1016").missing).toMatch(/ready for processing/i);
    expect(whyWaiting(full, "26H2345")).toMatchObject({ missing: null });
  });
});
