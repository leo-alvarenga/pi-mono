import { describe, it, expect, afterEach } from "vitest";
import { writeFileSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { hashRead } from "../hash";

const files: string[] = [];

afterEach(() => {
  files.splice(0).forEach((p) => {
    try {
      unlinkSync(p);
    } catch {}
  });
});

function tmp(content: string): string {
  const p = join(
    tmpdir(),
    `hash-read-${Date.now()}-${Math.random().toString(36).slice(2)}.txt`,
  );
  writeFileSync(p, content, "utf8");
  files.push(p);
  return p;
}

describe("hashRead", () => {
  it("missing file throws ENOENT", () => {
    expect(() => hashRead("/tmp/pi-test-does-not-exist-xyz123.txt")).toThrow(
      "ENOENT",
    );
  });
  it("no range → all lines returned", () => {
    const p = tmp("a\nb\nc");
    expect(hashRead(p).split("\n")).toHaveLength(3);
  });
  it("startLine=2, endLine=3 → only those two lines (1-indexed)", () => {
    const p = tmp("a\nb\nc");
    const lines = hashRead(p, 2, 3).split("\n");
    expect(lines).toHaveLength(2);
    expect(lines[0]).toContain("| b");
    expect(lines[1]).toContain("| c");
  });
  it("startLine >= endLine throws with range error", () => {
    const p = tmp("a\nb\nc");
    expect(() => hashRead(p, 3, 2)).toThrow();
    expect(() => hashRead(p, 2, 2)).toThrow();
  });
  it("each line matches /^\\[[\\da-f]{4}\\] \\d+ \\| /", () => {
    const p = tmp("hello\nworld");
    for (const line of hashRead(p).split("\n")) {
      expect(line).toMatch(/^\[[\da-f]{4}\] \d+ \| /);
    }
  });
});
