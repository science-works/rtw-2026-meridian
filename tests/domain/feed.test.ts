import { describe, expect, it } from "vitest";
import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createApp } from "../../server/src/app";
import { loadData } from "../../server/src/domain/load";
import { resolveFeed, workbookFeed, type FeedAdapter } from "../../server/src/feed";
import { createState } from "../../server/src/state";
import type { CellpathData, EventsPage } from "../../shared/types";

const NO_TARGETS = { urgent: null, screening: null, routine: null };

describe("B5: FeedAdapter", () => {
  it("the workbook feed is the default and loads the converted dataset", () => {
    const feed = resolveFeed({});
    expect(feed.name).toBe("workbook");
    expect(feed.load().cases).toHaveLength(450);
  });

  it("MERIDIAN_DATA points the workbook feed at another normalised JSON export", () => {
    const d = loadData();
    const small: CellpathData = { ...d, cases: d.cases.filter((c) => c.caseId === "26H1018"), blocks: d.blocks.filter((b) => b.caseId === "26H1018"), slides: d.slides.filter((s) => s.caseId === "26H1018"), events: d.events.filter((e) => e.caseId === "26H1018") };
    const path = join(tmpdir(), `meridian-feed-${process.pid}.json`);
    writeFileSync(path, JSON.stringify(small));
    const feed = resolveFeed({ MERIDIAN_DATA: path });
    expect(feed.name).toBe("json export");
    expect(feed.load().cases.map((c) => c.caseId)).toEqual(["26H1018"]);
  });

  it("any adapter can drive the whole API: state, alerts, estimates and events", async () => {
    const d = loadData();
    const custom: FeedAdapter = {
      name: "test-lims",
      description: "In-memory test feed",
      load: () => ({ ...d, cases: d.cases.filter((c) => c.caseId === "26H1004"), events: d.events.filter((e) => e.caseId === "26H1004") }),
    };
    const app = createApp(createState(custom.load(), NO_TARGETS, custom.name));
    const health = await (await app.request("/api/health")).json();
    expect(health.feed).toBe("test-lims");
    const events = (await (await app.request("/api/events")).json()) as EventsPage;
    expect(events.feed).toBe("test-lims");
    expect(events.total).toBe(10);
    const alerts = await (await app.request("/api/alerts")).json();
    expect(alerts.map((a: { kind: string }) => a.kind)).toEqual(["protocol_mismatch"]);
  });

  it("workbookFeed describes where its data came from", () => {
    expect(workbookFeed().description).toMatch(/CellPath_Mock_Data\.xlsx/);
  });
});
