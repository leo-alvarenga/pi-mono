import { describe, it, expect } from "vitest";
import { wildcardMatch } from "../permission/wildcard";

describe("wildcardMatch", () => {
  it("* matches zero chars", () => expect(wildcardMatch("", "*")).toBe(true));
  it("* matches multiple chars", () => expect(wildcardMatch("anything/at/all", "*")).toBe(true));
  it("? matches exactly one char", () => {
    expect(wildcardMatch("a", "?")).toBe(true);
    expect(wildcardMatch("", "?")).toBe(false);
    expect(wildcardMatch("ab", "?")).toBe(false);
  });
  it("trailing ' *' makes the argument optional", () => {
    expect(wildcardMatch("ls", "ls *")).toBe(true);
    expect(wildcardMatch("ls -la", "ls *")).toBe(true);
    expect(wildcardMatch("ls -la /tmp", "ls *")).toBe(true);
  });
  it("backslash normalized to slash", () => {
    expect(wildcardMatch("a\\b\\c", "a/b/c")).toBe(true);
  });
  it("exact match without wildcards", () => {
    expect(wildcardMatch("read", "read")).toBe(true);
    expect(wildcardMatch("write", "read")).toBe(false);
  });
});
