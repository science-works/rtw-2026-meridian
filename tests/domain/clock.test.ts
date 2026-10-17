import { describe, expect, it } from "vitest";
import { CLOCK, formatSimTime, parseSimTime } from "../../shared/clock";

describe("simulated clock", () => {
  it("parses Day N HH:MM into minutes from Day 0 00:00", () => {
    expect(parseSimTime("Day 0 00:00")).toBe(0);
    expect(parseSimTime("Day 1 11:30")).toBe(1440 + 690);
    expect(parseSimTime("Day -1 06:30")).toBe(-1440 + 390);
  });

  it("round-trips through formatSimTime", () => {
    for (const s of ["Day -1 06:30", "Day 0 15:30", "Day 1 11:30", "Day 2 07:05"]) {
      expect(formatSimTime(parseSimTime(s))).toBe(s);
    }
  });

  it("rejects strings that are not simulated times", () => {
    expect(() => parseSimTime("Tuesday 11:30")).toThrow();
    expect(() => parseSimTime("Day 1 25:00")).toThrow();
  });

  it("fixes the shared clock at Tuesday, Day 1 11:30", () => {
    expect(CLOCK).toBe("Day 1 11:30");
  });
});
