import assert from "node:assert/strict";

import {
  capitalize,
  formatDuration,
  formatTokens,
  truncateBytes,
  truncateChars,
} from "./strings";
import { mapWithConcurrencyLimit } from "./concurrency";

// capitalize
assert.equal(capitalize("claude"), "Claude");
assert.equal(capitalize(""), "");
assert.equal(capitalize("A"), "A");

// truncateChars
assert.equal(truncateChars("hello", 10), "hello");
assert.equal(truncateChars("hello world", 5), "hello…");

// truncateBytes (from pi-mini-subagents/src/core.test.ts)
assert.equal(truncateBytes("abc", 100), "abc");
assert.ok(truncateBytes("x".repeat(1000), 10).includes("truncated"));

// formatTokens
assert.equal(formatTokens(500), "500 tokens");
assert.equal(formatTokens(1500), "1.5k tokens");
assert.equal(formatTokens(15000), "15k tokens");

// formatDuration (from pi-notify/src/core.test.ts)
assert.equal(formatDuration(0), "<1s");
assert.equal(formatDuration(45_000), "45s");
assert.equal(formatDuration(134_000), "2m 14s");
assert.equal(formatDuration(3_900_000), "1h 5m");

// mapWithConcurrencyLimit: max in-flight never exceeds limit
{
  let inFlight = 0;
  let maxInFlight = 0;
  const results = await mapWithConcurrencyLimit(
    [1, 2, 3, 4, 5, 6],
    2,
    async (item) => {
      inFlight++;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise((r) => setTimeout(r, 0));
      inFlight--;
      return item * 2;
    },
  );
  assert.ok(maxInFlight <= 2, `maxInFlight was ${maxInFlight}`);
  assert.deepEqual(results, [2, 4, 6, 8, 10, 12]);
}

// mapWithConcurrencyLimit: empty input
assert.deepEqual(await mapWithConcurrencyLimit([], 4, async (x) => x), []);

console.log("pi-ext-core utils OK");
