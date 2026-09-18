import { describe, it, expect } from "vitest";
import { generateName } from "../names";

describe("generateName", () => {
  it("returns a string matching /^[a-z]+-[a-z]+$/", () => {
    expect(generateName()).toMatch(/^[a-z]+-[a-z]+$/);
  });
  it("20 calls produce different names (non-deterministic — high probability)", () => {
    const names = Array.from({ length: 20 }, generateName);
    expect(new Set(names).size).toBeGreaterThan(1);
  });
});
