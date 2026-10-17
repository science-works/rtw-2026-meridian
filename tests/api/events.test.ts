import { describe, expect, it } from "vitest";
import { parseSimTime } from "../../shared/clock";
import type { EventsPage } from "../../shared/types";
import { freshApp } from "./helpers";

describe("B5: GET /api/events (paged, read-only)", () => {
  it("returns the first page of recorded events in time order", async () => {
    const { body } = await freshApp().get<EventsPage>("/api/events");
    expect(body).toMatchObject({ feed: "workbook", total: 1253, offset: 0, limit: 100, nextOffset: 100 });
    expect(body.events).toHaveLength(100);
    const t = body.events.map((e) => parseSimTime(e.at));
    expect(t).toEqual([...t].sort((a, b) => a - b));
  });

  it("pages through every event of the workbook exactly once (nothing held back)", async () => {
    const { get } = freshApp();
    const ids: string[] = [];
    let offset: number | null = 0;
    while (offset !== null) {
      const { body }: { body: EventsPage } = await get<EventsPage>(`/api/events?limit=500&offset=${offset}`);
      ids.push(...body.events.map((e) => e.eventId));
      offset = body.nextOffset;
    }
    expect(ids).toHaveLength(1253);
    expect(new Set(ids).size).toBe(1253);
    expect(ids).toContain("EV-01215");
  });

  it("includes the recorded H&E incident with its station, box and basket; reset keeps it", async () => {
    const { get, post } = freshApp();
    const fired = (await get<EventsPage>("/api/events?type=STAIN_RUN_FAILED")).body;
    expect(fired.total).toBe(1);
    expect(fired.events[0]).toMatchObject({ eventId: "EV-01215", at: "Day 1 10:45", station: "H&E auto-stainer 1", box: "Box 1", basket: "Basket 1", activation: "Detected; attention required" });
    await post("/api/sim/reset");
    expect((await get<EventsPage>("/api/events")).body.total).toBe(1253);
  });

  it("filters by case (any case) and by event type", async () => {
    const { get } = freshApp();
    const c = (await get<EventsPage>("/api/events?caseId=26h1003")).body;
    expect(c.total).toBe(13);
    expect(c.events.every((e) => e.caseId === "26H1003")).toBe(true);
    expect((await get<EventsPage>("/api/events?type=CASE_RECEIVED")).body.total).toBe(450);
  });

  it("clamps paging parameters", async () => {
    const { get } = freshApp();
    expect((await get<EventsPage>("/api/events?limit=5000")).body.limit).toBe(500);
    expect((await get<EventsPage>("/api/events?limit=0")).body.limit).toBe(1);
    expect((await get<EventsPage>("/api/events?offset=-5")).body.offset).toBe(0);
    expect((await get<EventsPage>("/api/events?limit=abc")).body.limit).toBe(100);
    const last = (await get<EventsPage>("/api/events?offset=1200&limit=100")).body;
    expect(last.events).toHaveLength(53);
    expect(last.nextOffset).toBeNull();
  });

  it("uses generic equipment labels and is read-only", async () => {
    const { app, get } = freshApp();
    const all = (await get<EventsPage>("/api/events?limit=500")).body;
    expect(JSON.stringify(all)).not.toMatch(/Pegasus|Logos|Prisma|Stainer 1|Microtome |IQC desk/);
    expect((await app.request("/api/events", { method: "POST" })).status).toBe(404);
    expect((await app.request("/api/events", { method: "DELETE" })).status).toBe(404);
  });
});
