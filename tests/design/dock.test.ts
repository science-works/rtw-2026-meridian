// Dock behaviour: one red "!" per open incident; only a live New incident bounces; acknowledge stops it.
import { describe, expect, it } from "vitest";
import { createApp } from "../../server/src/app";
import { loadData } from "../../server/src/domain/load";
import { createState } from "../../server/src/state";
import type { Alert, Overview } from "../../shared/types";
import { dockItems } from "../../web/src/components/dockItems";

const ID = encodeURIComponent("basket_failure:H&E-BASKET-01");
const setup = () => {
  const app = createApp(createState(loadData(), { urgent: null, screening: null, routine: null }, "workbook", { stepMs: 0 }));
  const get = async <T,>(p: string) => (await (await app.request(p)).json()) as T;
  const post = (p: string) => app.request(p, { method: "POST" });
  return { get, post };
};

describe("incident dock", () => {
  it("before the replay: 3 static markers (none bounce)", async () => {
    const { get } = setup();
    const items = dockItems(await get<Alert[]>("/api/alerts"), true);
    expect(items).toHaveLength(3);
    expect(items.some((i) => i.bounce)).toBe(false);
  });

  it("the replay adds a 4th marker that bounces; acknowledge stops the bounce but keeps it in the dock", async () => {
    const { get, post } = setup();
    await post("/api/sim/replay-incident");
    let items = dockItems(await get<Alert[]>("/api/alerts"), true);
    expect(items).toHaveLength(4);
    expect(items.filter((i) => i.bounce).map((i) => i.id)).toEqual(["basket_failure:H&E-BASKET-01"]);
    await post(`/api/alerts/${ID}/acknowledge`);
    items = dockItems(await get<Alert[]>("/api/alerts"), true);
    expect(items).toHaveLength(4);
    expect(items.some((i) => i.bounce)).toBe(false);
  });

  it("reduced motion: never bounces (static red marker)", async () => {
    const { get, post } = setup();
    await post("/api/sim/replay-incident");
    expect(dockItems(await get<Alert[]>("/api/alerts"), false).some((i) => i.bounce)).toBe(false);
  });
});

describe("completion donut", () => {
  it("8 of 450 cases have left the lab (2%)", async () => {
    const { get } = setup();
    const o = await get<Overview>("/api/overview");
    expect([o.ready, o.total, Math.round((o.ready / o.total) * 100)]).toEqual([8, 450, 2]);
  });
});

describe("every demo case has a case page", () => {
  it("all 22 demo cases resolve through the API the case page uses", async () => {
    const { get } = setup();
    const demo = (await get<{ caseId: string }[]>("/api/cases?demo=true")).map((c) => c.caseId);
    expect(demo).toHaveLength(22);
    for (const id of demo) expect((await get<{ caseId: string }>(`/api/cases/${id}`)).caseId).toBe(id);
  });
});
