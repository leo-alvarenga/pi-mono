import { describe, it, expect } from "vitest";
import { mapWithConcurrencyLimit } from "../utils/concurrency";

describe("mapWithConcurrencyLimit", () => {
  it("output order matches input order", async () => {
    const result = await mapWithConcurrencyLimit([3, 1, 2], 2, async (x) => x * 10);
    expect(result).toEqual([30, 10, 20]);
  });
  it("empty input resolves to [] without hanging", async () => {
    expect(await mapWithConcurrencyLimit([], 4, async (x) => x)).toEqual([]);
  });
  it("concurrency > items.length: clamped, no crash", async () => {
    const result = await mapWithConcurrencyLimit([1], 100, async (x) => x);
    expect(result).toEqual([1]);
  });
  it("one task rejects: Promise.all rejects", async () => {
    await expect(
      mapWithConcurrencyLimit([1, 2, 3], 2, async (x) => {
        if (x === 2) throw new Error("boom");
        return x;
      }),
    ).rejects.toThrow("boom");
  });
});
