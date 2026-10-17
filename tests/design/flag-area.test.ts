// Dashboard flag area: only New incidents; 26H1004 at 11:30; acknowledge removes it.
import { describe, expect, it } from "vitest";
import type { Alert } from "../../shared/types";
import { briefOf } from "../../web/src/components/FlagArea";
import { freshApp } from "../api/helpers";

const fresh = (alerts: Alert[]) => alerts.filter((a) => a.state === "new");

describe("dashboard flag area", () => {
  it("shows exactly one bouncing flag at 11:30: 26H1004 at Microtomy station 4", async () => {
    const { get } = freshApp();
    const f = fresh((await get<Alert[]>("/api/alerts")).body);
    expect(f.map((a) => briefOf(a))).toEqual(["Incident · Microtomy station 4 · levels not recorded (1 of 3)"]);
  });

  it("acknowledge removes it from the flag area; it stays open in the incidents list", async () => {
    const { get, post } = freshApp();
    await post(`/api/alerts/${encodeURIComponent("protocol_mismatch:26H1004/A1")}/acknowledge`);
    const all = (await get<Alert[]>("/api/alerts")).body;
    expect(fresh(all)).toEqual([]);
    expect(all.find((a) => a.kind === "protocol_mismatch")).toMatchObject({ state: "acknowledged", stateDetail: "Acknowledged — awaiting check" });
  });
});
