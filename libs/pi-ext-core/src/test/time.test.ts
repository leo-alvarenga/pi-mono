import { describe, it, expect } from "vitest";
import { hasTimeElapsed } from "../utils/time";

describe("hasTimeElapsed", () => {
  it("elapsed by exactly durationMs returns true", () => {
    const past = Date.now() - 1000;
    expect(hasTimeElapsed(past, 1000)).toBe(true);
  });
  it("elapsed by less returns false", () => {
    const past = Date.now() - 500;
    expect(hasTimeElapsed(past, 1000)).toBe(false);
  });
  it("invalid date string returns false (NaN guard)", () => {
    expect(hasTimeElapsed("not-a-date", 0)).toBe(false);
  });
});
