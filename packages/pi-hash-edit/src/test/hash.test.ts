import { describe, it, expect } from "vitest";
import { getLineHash } from "../hash";

describe("getLineHash", () => {
  it("same content → same hash (deterministic)", () => {
    expect(getLineHash("hello world")).toBe(getLineHash("hello world"));
  });
  it("CRLF and LF produce the same hash", () => {
    expect(getLineHash("line\r\n")).toBe(getLineHash("line\n"));
  });
  it("trailing space vs no trailing space produces same hash (trimEnd)", () => {
    expect(getLineHash("line   ")).toBe(getLineHash("line"));
  });
  it("different content → different hash (no trivial collision)", () => {
    expect(getLineHash("foo")).not.toBe(getLineHash("bar"));
  });
  it("returns exactly 4 hex chars", () => {
    expect(getLineHash("any content here")).toMatch(/^[\da-f]{4}$/);
  });
});
