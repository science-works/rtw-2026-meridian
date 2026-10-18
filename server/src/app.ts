// HTTP API over the single in-memory state (MASTER_PLAN §4).
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { streamSSE } from "hono/streaming";
import { displayText, generic, stationParts } from "../../shared/labels";
import { parseSimTime } from "../../shared/clock";
import { STAGES } from "../../shared/types";
import type { BlockRecord, CaseDetail, CaseRecord, CaseSummary, DelayedResponse, EventRecord, EventsPage, FeedEvent, Overview, SimulationResponse, Stage } from "../../shared/types";
import { PLAY_FROM, PLAY_TO, buildTimeline } from "../../shared/simulation";
import { validate } from "./domain/validate";
import { computeStations, whyWaiting } from "./domain/stations";
import { blockRange } from "./domain/alerts";
import { answerQuestion } from "./domain/chat";
import { createActivityLog, summarise, wallClock, type ActivityLog } from "./activity";
import { ConflictError, NotFoundError, createState, type MeridianState } from "./state";
import { hasAnyTarget } from "./targets";

const SCRIPT_PATH = fileURLToPath(new URL("../../pitch/SCRIPT.md", import.meta.url));

const toFeedEvent = (e: EventRecord): FeedEvent => ({
  eventId: e.eventId,
  at: e.at,
  caseId: e.caseId,
  ...(e.blockId ? { blockId: e.blockId } : {}),
  ...(e.slideId ? { slideId: e.slideId } : {}),
  stage: e.stage,
  ...(e.station ? { station: generic(e.station), ...stationParts(e.station) } : {}),
  type: e.type,
  details: displayText(e.details),
  ...(e.activation && e.activation !== "Recorded" ? { activation: e.activation } : {}),
  ...(e.initials ? { initials: e.initials } : {}),
});

/**
 * A block's stage. When a case's blocks have diverged (some complete, some outstanding),
 * each block takes the stage of its own latest recorded event; otherwise it shares the
 * case's recorded stage. Null when that event's stage is not a case stage.
 */
function blockStage(c: CaseRecord, b: BlockRecord, events: EventRecord[]): Stage | null {
  const diverged = c.blocksComplete > 0 && c.blocksComplete < c.blocksExpected;
  const own = events.filter((e) => e.blockId === b.blockId);
  if (!diverged || own.length === 0) return c.stageSnapshot;
  const last = own.reduce((x, y) => (parseSimTime(y.at) > parseSimTime(x.at) || (y.at === x.at && y.eventId > x.eventId) ? y : x));
  return (STAGES as readonly string[]).includes(last.stage) ? (last.stage as Stage) : null;
}

const intParam = (v: string | undefined, fallback: number) => {
  const n = Number.parseInt(v ?? "", 10);
  return Number.isFinite(n) ? n : fallback;
};

const matchesProgramme = (tag: string | null, q: string) =>
  q === "any" ? tag !== null : (tag ?? "").toLowerCase() === q.toLowerCase();

export function createApp(state: MeridianState = createState(), activity: ActivityLog = createActivityLog()) {
  const app = new Hono();
  app.use("/api/*", cors());

  // Agent console: log reads the MCP server tags as its own. Auxiliary lookups are not shown.
  app.use("/api/*", async (c, next) => {
    await next();
    if (c.req.method !== "GET" || c.req.header("X-Meridian-Client") !== "mcp" || c.req.header("X-Meridian-Aux")) return;
    if (c.req.path === "/api/stream" || c.req.path.startsWith("/api/agent")) return;
    const body = await c.res.clone().json().catch(() => null);
    activity.add({
      at: wallClock(),
      tool: c.req.header("X-Meridian-Tool") ?? "unknown",
      ...(c.req.header("X-Meridian-Run") ? { runId: c.req.header("X-Meridian-Run") } : {}),
      path: c.req.path,
      ...summarise(c.req.path, c.req.query(), c.res.status, body),
    });
  });

  const alertIdsByCase = () => {
    const m = new Map<string, string[]>();
    for (const a of state.alerts) for (const id of a.caseIds) m.set(id, [...(m.get(id) ?? []), a.id]);
    return m;
  };

  /** Block locations: one label, or each distinct location with its blocks. */
  const locationOf = (caseId: string) => {
    const blocks = state.data.blocks.filter((b) => b.caseId === caseId);
    const locs = [...new Set(blocks.map((b) => generic(b.location)))];
    if (locs.length <= 1) return locs[0] ?? "Not recorded";
    return locs.map((l) => `${l} (${blockRange(blocks.filter((b) => generic(b.location) === l).map((b) => b.blockId))})`).join(" · ");
  };

  const summary = (c: CaseRecord, alertIds: Map<string, string[]>): CaseSummary => ({
    caseId: c.caseId,
    cohort: c.cohort,
    specimen: c.specimen,
    priority: c.priority,
    programmeTag: c.programmeTag,
    stage: c.stageSnapshot,
    stageEnteredAt: c.stageEnteredAt,
    location: locationOf(c.caseId),
    isDemo: c.isDemo,
    alertIds: alertIds.get(c.caseId) ?? [],
    estimate: state.estimates.get(c.caseId)!,
  });

  app.get("/api/health", (c) => c.json({ ok: true, simulated: true, clock: state.data.meta.clock, version: state.version, feed: state.feed }));

  // Paged, read-only event log: recorded events only (the staged trigger appears once fired).
  app.get("/api/events", (c) => {
    const q = c.req.query();
    const limit = Math.min(Math.max(intParam(q.limit, 100), 1), 500);
    const offset = Math.max(intParam(q.offset, 0), 0);
    const caseId = q.caseId?.toUpperCase();
    const all = state.data.events
      .filter((e) => !caseId || e.caseId === caseId)
      .filter((e) => !q.type || e.type === q.type)
      .sort((a, b) => parseSimTime(a.at) - parseSimTime(b.at) || a.eventId.localeCompare(b.eventId));
    const page = all.slice(offset, offset + limit);
    return c.json<EventsPage>({
      feed: state.feed,
      total: all.length,
      offset,
      limit,
      nextOffset: offset + limit < all.length ? offset + limit : null,
      events: page.map(toFeedEvent),
    });
  });

  app.get("/api/overview", (c) => {
    const { counts } = validate(state.data);
    return c.json<Overview>({
      clock: state.data.meta.clock,
      total: counts.cases,
      backlog: counts.backlog,
      today: counts.today,
      urgent: state.data.cases.filter((c) => c.priority === "Urgent").length,
      screeningLinked: state.data.cases.filter((c) => c.programmeTag !== null).length,
      ready: counts.stages.find((s) => s.stage === "Ready for pathologist handoff")!.total,
      openAttention: state.alerts.filter((a) => a.state !== "resolved").length,
      stages: counts.stages,
      triggerFired: state.triggerFired,
    });
  });

  app.get("/api/alerts", (c) => c.json(state.alerts));
  app.get("/api/alerts/:id", (c) => {
    const a = state.alerts.find((x) => x.id === c.req.param("id"));
    return a ? c.json(a) : c.json({ error: `No alert ${c.req.param("id")}` }, 404);
  });

  // The presenter's Acknowledge (a human action from the dashboard; MCP cannot call it).
  app.post("/api/alerts/:id/acknowledge", (c) => {
    try {
      state.acknowledge(c.req.param("id"));
      return c.json({ acknowledged: true });
    } catch (e) {
      if (e instanceof NotFoundError) return c.json({ error: e.message }, 404);
      if (e instanceof ConflictError) return c.json({ error: e.message }, 409);
      throw e;
    }
  });

  // Light simulation: each case's recorded waypoints, replayed in the browser with the same pure stateAt(t).
  app.get("/api/simulation", (c) => {
    const tl = buildTimeline(state.data);
    const body: SimulationResponse = {
      from: PLAY_FROM,
      to: PLAY_TO,
      cases: [...tl.cases].map(([caseId, v]) => ({ caseId, urgent: v.urgent, waypoints: v.waypoints.map((w) => [w.t, w.node] as [number, string]) })),
      incidents: tl.incidents,
      splits: tl.splits,
      events: state.data.events
        .filter((e) => e.type !== "CURRENT_STAGE_SNAPSHOT")
        .map((e) => ({ t: parseSimTime(e.at), caseId: e.caseId, station: e.station ? generic(e.station) : null, type: e.type, id: e.eventId }))
        .sort((a, b) => a.t - b.t || a.id.localeCompare(b.id))
        .map(({ id: _id, ...e }) => e),
    };
    return c.json(body);
  });

  // Lab-flow map (spec Screen B): zones and equipment with their recorded contents.
  app.get("/api/stations", (c) => c.json(computeStations(state.data, state.alerts)));
  app.get("/api/stations/:id", (c) => {
    const card = computeStations(state.data, state.alerts).find((s) => s.id === c.req.param("id").toLowerCase());
    return card ? c.json(card) : c.json({ error: `No station ${c.req.param("id")} on the lab-flow map` }, 404);
  });

  app.get("/api/cases", (c) => {
    const { stage, priority, programme, demo } = c.req.query();
    const ids = alertIdsByCase();
    return c.json(
      state.data.cases
        .filter((x) => !stage || x.stageSnapshot === stage)
        .filter((x) => !priority || x.priority.toLowerCase() === priority.toLowerCase())
        .filter((x) => !programme || matchesProgramme(x.programmeTag, programme))
        .filter((x) => demo === undefined || x.isDemo === (demo === "true"))
        .map((x) => summary(x, ids)),
    );
  });

  const caseDetail = (raw: string): CaseDetail | null => {
    const id = raw.toUpperCase();
    const rec = state.data.cases.find((x) => x.caseId === id);
    if (!rec) return null;
    const caseEvents = state.data.events.filter((e) => e.caseId === id);
    return {
      ...summary(rec, alertIdsByCase()),
      waiting: whyWaiting(state.data, id),
      blocks: state.data.blocks
        .filter((b) => b.caseId === id)
        .map((b) => ({
          blockId: b.blockId,
          stage: blockStage(rec, b, caseEvents),
          location: generic(b.location),
          status: displayText(b.status),
          levelsRequired: b.levelsRequired,
          levelsRecorded: b.levelsRecorded,
        })),
      slides: state.data.slides
        .filter((s) => s.caseId === id)
        .map((s) => ({ slideId: s.slideId, blockId: s.blockId, level: s.level ?? undefined, basket: s.basket ? generic(s.basket) : undefined })),
      timeline: [...caseEvents].sort((a, b) => parseSimTime(a.at) - parseSimTime(b.at) || a.eventId.localeCompare(b.eventId)).map(toFeedEvent),
    };
  };

  app.get("/api/cases/:id", (c) => {
    const detail = caseDetail(c.req.param("id"));
    return detail ? c.json(detail) : c.json({ error: `No case ${c.req.param("id").toUpperCase()} in the simulated dataset` }, 404);
  });

  const delayed = (programme?: string): DelayedResponse => {
    const ids = alertIdsByCase();
    // Recorded holds (active alerts), plus cases past a configured target. Delay is
    // never claimed without a target in config/targets.json.
    const cases = state.data.cases
      .filter((x) => !programme || matchesProgramme(x.programmeTag, programme))
      .map((x) => summary(x, ids))
      .filter((x) => x.alertIds.length > 0 || (typeof x.estimate.target === "object" && x.estimate.target.late));
    const unset = (Object.keys(state.targets) as (keyof typeof state.targets)[]).filter((k) => state.targets[k] === null);
    const note = !hasAnyTarget(state.targets)
      ? "target comparison unavailable"
      : unset.length
        ? `target comparison unavailable for: ${unset.join(", ")}`
        : undefined;
    return note ? { cases, note } : { cases };
  };

  app.get("/api/delayed", (c) => c.json(delayed(c.req.query().programme)));

  // Presenter notes: pitch/SCRIPT.md verbatim (read on each request, so edits show on reload).
  app.get("/api/pitch", (c) => {
    try {
      return c.json({ markdown: readFileSync(SCRIPT_PATH, "utf8") });
    } catch {
      return c.json({ error: "pitch/SCRIPT.md not found" }, 404);
    }
  });

  // Meridian chat: deterministic answers from the same read functions (spec Screen E). Read-only.
  app.get("/api/chat", (c) => {
    const q = c.req.query().q ?? "";
    const ids = alertIdsByCase();
    return c.json(
      answerQuestion(q, {
        cases: () => state.data.cases.map((x) => summary(x, ids)),
        caseDetail,
        stations: () => computeStations(state.data, state.alerts),
        alerts: () => state.alerts,
        delayed,
      }),
    );
  });

  app.get("/api/stream", (c) =>
    streamSSE(c, async (stream) => {
      const send = (version: number) => stream.writeSSE({ event: "state-changed", data: JSON.stringify({ version }) });
      const unsubscribe = state.subscribe((v) => void send(v));
      const unsubscribeActivity = activity.subscribe((e) =>
        void stream.writeSSE(e.type === "add" ? { event: "agent-activity", data: JSON.stringify(e.record) } : { event: "agent-cleared", data: "{}" }),
      );
      stream.onAbort(() => {
        unsubscribe();
        unsubscribeActivity();
      });
      await send(state.version);
      while (!stream.aborted) {
        await stream.sleep(15_000);
        if (!stream.aborted) await stream.writeSSE({ event: "ping", data: "" });
      }
      unsubscribe();
      unsubscribeActivity();
    }),
  );

  app.get("/api/agent/activity", (c) => c.json(activity.list()));
  // Simulator-style control for rehearsals: clears the console log only, never case state.
  app.post("/api/agent/clear", (c) => {
    activity.clear();
    return c.json({ cleared: true });
  });

  // The recorded H&E incident is part of the 11:30 data, so there is nothing to replay (409).
  app.post("/api/sim/basket-failure", (c) => c.json({ error: "The H&E incident is already recorded in the 11:30 data; there is nothing to replay." }, 409));

  app.post("/api/sim/replay-incident", (c) => c.json({ error: "The H&E incident is already recorded in the 11:30 data; there is nothing to replay." }, 409));

  app.post("/api/sim/reset", (c) => {
    state.reset();
    activity.clear();
    return c.json({ reset: true, version: state.version });
  });

  return app;
}
