// T0 contract stub. Real data where it already exists (P1); explicit "not built yet"
// everywhere else, so nothing downstream ever shows an invented number.
import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { cors } from "hono/cors";
import type { CaseDetail, CaseSummary, CellpathData, DelayedResponse, Estimate, Overview } from "../../shared/types";
import { loadData } from "./domain/load";
import { validate } from "./domain/validate";

const NO_ESTIMATE_YET: Estimate = {
  status: "unknown",
  components: [],
  assumptions: [],
  reasonUnknown: "Handoff estimates are not built yet (P3).",
};

export function createApp(data: CellpathData = loadData()) {
  const { counts } = validate(data);
  const app = new Hono();
  app.use("/api/*", cors());

  const summary = (c: CellpathData["cases"][number]): CaseSummary => ({
    caseId: c.caseId,
    cohort: c.cohort,
    specimen: c.specimen,
    priority: c.priority,
    programmeTag: c.programmeTag,
    stage: c.stageSnapshot,
    stageEnteredAt: c.stageEnteredAt,
    isDemo: c.isDemo,
    alertIds: [],
    estimate: NO_ESTIMATE_YET,
  });

  app.get("/api/health", (c) => c.json({ ok: true, simulated: true, clock: data.meta.clock }));

  app.get("/api/overview", (c) =>
    c.json<Overview>({
      clock: data.meta.clock,
      total: counts.cases,
      backlog: counts.backlog,
      today: counts.today,
      ready: counts.stages.find((s) => s.stage === "Ready for pathologist handoff")!.total,
      stages: counts.stages,
      triggerFired: false,
    }),
  );

  app.get("/api/cases", (c) => {
    const { stage, priority, programme, demo } = c.req.query();
    const list = data.cases
      .filter((x) => !stage || x.stageSnapshot === stage)
      .filter((x) => !priority || x.priority === priority)
      .filter((x) => !programme || x.programmeTag === programme)
      .filter((x) => demo === undefined || x.isDemo === (demo === "true"))
      .map(summary);
    return c.json(list);
  });

  app.get("/api/cases/:id", (c) => {
    const rec = data.cases.find((x) => x.caseId === c.req.param("id"));
    if (!rec) return c.json({ error: `No case ${c.req.param("id")} in the simulated dataset` }, 404);
    const detail: CaseDetail = {
      ...summary(rec),
      blocks: data.blocks
        .filter((b) => b.caseId === rec.caseId)
        .map((b) => ({ blockId: b.blockId, stage: null, location: b.location, status: b.status, levelsRequired: b.levelsRequired, levelsRecorded: b.levelsRecorded })),
      slides: data.slides
        .filter((s) => s.caseId === rec.caseId)
        .map((s) => ({ slideId: s.slideId, blockId: s.blockId, level: s.level ?? undefined, basket: s.basket ?? undefined })),
      timeline: data.events
        .filter((e) => e.caseId === rec.caseId && e.activation === "Recorded")
        .map((e) => ({ eventId: e.eventId, at: e.at, type: e.type, stage: e.stage, blockId: e.blockId ?? undefined, details: e.details })),
    };
    return c.json(detail);
  });

  app.get("/api/alerts", (c) => c.json([])); // alert rules arrive in P2
  app.get("/api/delayed", (c) => c.json<DelayedResponse>({ cases: [], note: "target comparison unavailable" }));

  app.get("/api/stream", (c) =>
    streamSSE(c, async (stream) => {
      await stream.writeSSE({ event: "state-changed", data: JSON.stringify({ version: 0 }) });
      while (!stream.aborted) await stream.sleep(15_000).then(() => stream.writeSSE({ event: "ping", data: "" }));
    }),
  );

  app.post("/api/sim/basket-failure", (c) => c.json({ error: "Simulator not built yet (P5)." }, 501));
  app.post("/api/sim/reset", (c) => c.json({ error: "Simulator not built yet (P5)." }, 501));

  return app;
}
