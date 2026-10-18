import { describe, expect, it } from "vitest";
import { eventsPerHour } from "../../web/src/corners/TopLeft";
import { loadData } from "../../server/src/domain/load";
import { CLOCK_MINUTES, parseSimTime } from "../../shared/clock";

const DAY1 = 1440;

describe("eventsPerHour", () => {
  it("buckets events into hours from day start", () => {
    const b = eventsPerHour([{ t: DAY1 }, { t: DAY1 + 59 }, { t: DAY1 + 60 }, { t: DAY1 + 125 }], DAY1, DAY1 + 180);
    expect(b).toEqual([2, 1, 1]);
  });

  it("makes the last hour partial: 11:30 gives 12 buckets, 11:xx events in the last", () => {
    const b = eventsPerHour([{ t: DAY1 + 11 * 60 + 10 }, { t: CLOCK_MINUTES }], DAY1, CLOCK_MINUTES);
    expect(b).toHaveLength(12);
    expect(b[11]).toBe(2);
  });

  it("ignores events outside the day window", () => {
    const b = eventsPerHour([{ t: DAY1 - 1 }, { t: 600 }, { t: CLOCK_MINUTES + 1 }, { t: DAY1 + 30 }], DAY1, CLOCK_MINUTES);
    expect(b.reduce((a, x) => a + x, 0)).toBe(1);
    expect(b[0]).toBe(1);
  });

  it("returns zeroed buckets for empty input", () => {
    expect(eventsPerHour([], DAY1, CLOCK_MINUTES)).toEqual(new Array(12).fill(0));
  });

  it("sums to today's recorded non-snapshot events in the real data", () => {
    const data = loadData();
    const ts = data.events.filter((e) => e.type !== "CURRENT_STAGE_SNAPSHOT").map((e) => ({ t: parseSimTime(e.at) }));
    const expected = ts.filter((e) => e.t >= DAY1 && e.t <= CLOCK_MINUTES).length;
    const sum = eventsPerHour(ts, DAY1, CLOCK_MINUTES).reduce((a, x) => a + x, 0);
    expect(expected).toBeGreaterThan(0);
    expect(sum).toBe(expected);
  });
});
