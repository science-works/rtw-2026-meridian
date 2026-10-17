// Meridian chat (spec Screen E): deterministic answers to the six spec questions, built from the
// same server functions as the UI. No model; unknown questions are answered honestly.
import { describe, expect, it } from "vitest";
import type { Alert, CaseSummary, ChatAnswer, DelayedResponse, StationCard } from "../../shared/types";
import { findOverclaims } from "../../server/src/domain/wording";
import { freshApp } from "./helpers";

const ask = async (get: ReturnType<typeof freshApp>["get"], q: string) => {
  const r = await get<ChatAnswer>(`/api/chat?q=${encodeURIComponent(q)}`);
  expect(r.status).toBe(200);
  const text = [r.body.answer, ...r.body.facts].join("\n");
  expect(findOverclaims(text)).toEqual([]);
  return { ...r.body, text };
};

describe("GET /api/chat", () => {
  it("1. Where is case 26H2345? — ready for handoff since 09:30, with a link to the case", async () => {
    const { get } = freshApp();
    const a = await ask(get, "Where is case 26H2345?");
    expect(a.intent).toBe("where_case");
    expect(a.caseIds).toEqual(["26H2345"]);
    expect(a.text).toMatch(/Ready for pathologist handoff/);
    expect(a.text).toMatch(/09:30/);
    expect(a.text).toMatch(/urgent/i);
    expect(a.links).toContainEqual({ label: "Open 26H2345", to: "/case/26H2345" });
  });

  it("2. Why is 26H1004 waiting? — 1 of 3 levels at Microtomy station 4; staff check; link to the incident", async () => {
    const { get } = freshApp();
    const a = await ask(get, "Why is 26H1004 waiting?");
    const alerts = (await get<Alert[]>("/api/alerts")).body;
    const mismatch = alerts.find((x) => x.kind === "protocol_mismatch")!;
    expect(a.intent).toBe("why_case");
    expect(a.text).toMatch(/1 of 3/);
    expect(a.text).toMatch(/Microtomy station 4/);
    expect(a.text).toContain(mismatch.suggestedCheck);
    expect(a.links).toContainEqual({ label: "Open the incident", to: `/incident/${encodeURIComponent(mismatch.id)}` });
  });

  it("3. Which cases are in Processor D? — exactly the station card's cases", async () => {
    const { get } = freshApp();
    const a = await ask(get, "Which cases are in Processor D?");
    const card = (await get<StationCard>("/api/stations/processor-d")).body;
    expect(a.intent).toBe("station");
    expect(a.caseIds).toEqual(card.caseIds);
    expect(a.caseIds).toContain("26H1003");
    expect(a.links).toContainEqual({ label: "Open Processor D", to: "/station/processor-d" });
  });

  it("4. Which cases are affected by H&E-BASKET-01? — 26H1005–26H1014, 20 slides", async () => {
    const { get } = freshApp();
    const a = await ask(get, "Which cases are affected by H&E-BASKET-01?");
    const basket = (await get<Alert[]>("/api/alerts")).body.find((x) => x.kind === "basket_failure")!;
    expect(a.intent).toBe("basket");
    expect(a.caseIds).toEqual(basket.caseIds);
    expect(a.caseIds).toHaveLength(10);
    expect(a.text).toMatch(/20 slides/);
    expect(a.text).toMatch(/11:35/);
  });

  it("5. What is holding the urgent cases? — every urgent case not yet ready, each with its missing next event", async () => {
    const { get } = freshApp();
    const a = await ask(get, "What is holding the urgent cases?");
    const urgent = (await get<CaseSummary[]>("/api/cases?priority=urgent")).body.filter((c) => c.estimate.status !== "ready");
    expect(a.intent).toBe("urgent");
    expect([...a.caseIds].sort()).toEqual(urgent.map((c) => c.caseId).sort());
    expect(a.text).not.toMatch(/26H2345 .*waiting/); // ready, so not held
  });

  it("6. Screening-linked cases later than expected — holds only; no target, so it says so", async () => {
    const { get } = freshApp();
    const a = await ask(get, "Which screening-linked cases may reach the pathologist later than expected?");
    const delayed = (await get<DelayedResponse>("/api/delayed?programme=any")).body;
    expect(a.intent).toBe("screening_delayed");
    expect(a.caseIds).toEqual(delayed.cases.map((c) => c.caseId));
    expect(a.text).toMatch(/target comparison unavailable/);
  });

  it("an unknown case and an unknown question get an honest answer, never invented data", async () => {
    const { get } = freshApp();
    const missing = await ask(get, "Where is 26H9999?");
    expect(missing.caseIds).toEqual([]);
    expect(missing.text).toMatch(/No case 26H9999/);
    const other = await ask(get, "What is the weather like?");
    expect(other.intent).toBe("unknown");
    expect(other.caseIds).toEqual([]);
    expect(other.text).toMatch(/not enough information|can answer/i);
  });

  it("questions beyond pathologist handoff are declined without a time", async () => {
    const { get } = freshApp();
    const a = await ask(get, "When will 26H1004 be reported and what is the diagnosis?");
    expect(a.intent).toBe("out_of_scope");
    expect(a.text).not.toMatch(/\d\d:\d\d/);
  });

  it("is read-only: asking never changes the state version", async () => {
    const { get, state } = freshApp();
    const v = state.version;
    await ask(get, "Which cases are affected by H&E-BASKET-01?");
    expect(state.version).toBe(v);
  });
});
