// HTTP API over the single in-memory state (MASTER_PLAN §4).
import { Hono } from "hono";
import { cors } from "hono/cors";
import { streamSSE } from "hono/streaming";
import { displayText, generic } from "../../shared/labels";
import { parseSimTime } from "../../shared/clock";
import type { CaseDetail, CaseRecord, CaseSummary, DelayedResponse, EventRecord, EventsPage, FeedEvent, Overview, TriggerResponse } from "../../shared/types";
import { validate } from "./domain/validate";
import { AlreadyFiredError, createState, type MeridianState } from "./state";
import { hasAnyTarget } from "./targets";

const toFeedEvent = (e: EventRecord): FeedEvent => ({
  eventId: e.eventId,
  at: e.at,
  caseId: e.caseId,
  ...(e.blockId ? { blockId: e.blockId } : {}),
  ...(e.slideId ? { slideId: e.slideId } : {}),
  stage: e.stage,
  ...(e.station ? { station: generic(e.station) } : {}),
  type: e.type,
  details: displayText(e.details),
});

const intParam = (v: string | undefined, fallback: number) => {
  const n = Number.parseInt(v ?? "", 10);
  return Number.isFinite(n) ? n : fallback;
};

const matchesProgramme = (tag: string | null, q: string) =>
  q === "any" ? tag !== null : (tag ?? "").toLowerCase() === q.toLowerCase();

export function createApp(state: MeridianState = createState()) {
  const app = new Hono();
  app.use("/api/*", cors());

  const alertIdsByCase = () => {
    const m = new Map<string, string[]>();
    for (const a of state.alerts) for (const id of a.caseIds) m.set(id, [...(m.get(id) ?? []), a.id]);
    return m;
  };

  const summary = (c: CaseRecord, alertIds: Map<string, string[]>): CaseSummary => ({
    caseId: c.caseId,
    cohort: c.cohort,
    specimen: c.specimen,
    priority: c.priority,
    programmeTag: c.programmeTag,
    stage: c.stageSnapshot,
    stageEnteredAt: c.stageEnteredAt,
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
      .filter((e) => e.activation === "Recorded")
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
      ready: counts.stages.find((s) => s.stage === "Ready for pathologist handoff")!.total,
      stages: counts.stages,
      triggerFired: state.triggerFired,
    });
  });

  app.get("/api/alerts", (c) => c.json(state.alerts));

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

  app.get("/api/cases/:id", (c) => {
    const id = c.req.param("id").toUpperCase();
    const rec = state.data.cases.find((x) => x.caseId === id);
    if (!rec) return c.json({ error: `No case ${id} in the simulated dataset` }, 404);
    const detail: CaseDetail = {
      ...summary(rec, alertIdsByCase()),
      blocks: state.data.blocks
        .filter((b) => b.caseId === id)
        .map((b) => ({
          blockId: b.blockId,
          stage: null, // per-block stage is not derived yet: location and status are the recorded facts
          location: generic(b.location),
          status: displayText(b.status),
          levelsRequired: b.levelsRequired,
          levelsRecorded: b.levelsRecorded,
        })),
      slides: state.data.slides
        .filter((s) => s.caseId === id)
        .map((s) => ({ slideId: s.slideId, blockId: s.blockId, level: s.level ?? undefined, basket: s.basket ? generic(s.basket) : undefined })),
      timeline: state.data.events.filter((e) => e.caseId === id && e.activation === "Recorded").map(toFeedEvent),
    };
    return c.json(detail);
  });

  app.get("/api/delayed", (c) => {
    const { programme } = c.req.query();
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
    const body: DelayedResponse = note ? { cases, note } : { cases };
    return c.json(body);
  });

  app.get("/api/stream", (c) =>
    streamSSE(c, async (stream) => {
      const send = (version: number) => stream.writeSSE({ event: "state-changed", data: JSON.stringify({ version }) });
      const unsubscribe = state.subscribe((v) => void send(v));
      stream.onAbort(unsubscribe);
      await send(state.version);
      while (!stream.aborted) {
        await stream.sleep(15_000);
        if (!stream.aborted) await stream.writeSSE({ event: "ping", data: "" });
      }
      unsubscribe();
    }),
  );

  app.post("/api/sim/basket-failure", (c) => {
    try {
      const r = state.fireBasketFailure();
      return c.json<TriggerResponse>({ fired: true, ...r });
    } catch (e) {
      if (e instanceof AlreadyFiredError) return c.json({ error: e.message }, 409);
      throw e;
    }
  });

  app.post("/api/sim/reset", (c) => {
    state.reset();
    return c.json({ reset: true, version: state.version });
  });

  return app;
}
