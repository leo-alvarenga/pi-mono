import { describe, it, expect } from "vitest";
import {
  capitalize,
  formatDuration,
  truncateChars,
  truncateBytes,
  formatTokens,
} from "../utils/strings";

describe("truncateChars", () => {
  it("no ellipsis at exact boundary", () => {
    expect(truncateChars("hello", 5)).toBe("hello");
  });
  it("max=0 returns only ellipsis", () => {
    expect(truncateChars("hello", 0)).toBe("…");
  });
});

describe("truncateBytes", () => {
  it("cuts at multi-byte char boundary without splitting codepoint", () => {
    // "é" is 2 bytes; "aé" is 3 bytes total — only "a" fits in 2 bytes
    const result = truncateBytes("aé", 2);
    const firstLine = result.split("\n")[0];
    expect(firstLine).toBe("a");
    expect(Buffer.from(firstLine, "utf8").toString("utf8")).toBe(firstLine);
  });
});

describe("formatTokens", () => {
  it("0 tokens", () => expect(formatTokens(0)).toBe("0 tokens"));
  it("exact count below 1k", () =>
    expect(formatTokens(999)).toBe("999 tokens"));
  it("X.Xk format below 10k", () =>
    expect(formatTokens(1500)).toBe("1.5k tokens"));
  it("rounded k at 100000", () =>
    expect(formatTokens(100000)).toBe("100k tokens"));
});

describe("capitalize", () => {
  it("empty string does not throw", () => expect(capitalize("")).toBe(""));
});

describe("formatDuration", () => {
  it("0ms → <1s", () => expect(formatDuration(0)).toBe("<1s"));
  it("45s", () => expect(formatDuration(45_000)).toBe("45s"));
  it("2m 14s", () => expect(formatDuration(134_000)).toBe("2m 14s"));
  it("1h 5m", () => expect(formatDuration(3_900_000)).toBe("1h 5m"));
});
