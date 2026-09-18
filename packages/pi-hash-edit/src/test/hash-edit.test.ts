import { describe, it, expect, afterEach } from "vitest";
import { writeFileSync, readFileSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { getLineHash, hashEdit } from "../hash";

const files: string[] = [];

afterEach(() => {
  files.splice(0).forEach((p) => { try { unlinkSync(p); } catch {} });
});

function tmp(content: string): string {
  const p = join(tmpdir(), `hash-edit-${Date.now()}-${Math.random().toString(36).slice(2)}.txt`);
  writeFileSync(p, content, "utf8");
  files.push(p);
  return p;
}

describe("hashEdit", () => {
  it("hash mismatch → returns error string, file unchanged", () => {
    const p = tmp("line1\nline2");
    const original = readFileSync(p, "utf8");
    const result = hashEdit(p, "0000", "0000", "new");
    expect(result).toContain("Hash Mismatch");
    expect(readFileSync(p, "utf8")).toBe(original);
  });

  it("single-line replacement", () => {
    const p = tmp("a\nb\nc");
    const h = getLineHash("b");
    hashEdit(p, h, h, "replaced");
    expect(readFileSync(p, "utf8").split("\n")[1]).toBe("replaced");
  });

  it("multi-line replacement, surrounding lines preserved", () => {
    const p = tmp("a\nb\nc\nd");
    const h1 = getLineHash("b");
    const h2 = getLineHash("c");
    hashEdit(p, h1, h2, "x\ny");
    const lines = readFileSync(p, "utf8").split("\n");
    expect(lines[0]).toBe("a");
    expect(lines[1]).toBe("x");
    expect(lines[2]).toBe("y");
    expect(lines[3]).toBe("d");
  });

  it("trailing newline in newContent trimmed (no phantom blank line)", () => {
    const p = tmp("a\nb\nc");
    const h = getLineHash("b");
    hashEdit(p, h, h, "replaced\n");
    const content = readFileSync(p, "utf8");
    expect(content).not.toMatch(/replaced\n\n/);
  });

  it("displayPath appears in success message", () => {
    const p = tmp("a\nb");
    const h = getLineHash("a");
    const msg = hashEdit(p, h, h, "x", "display/path.ts");
    expect(msg).toContain("display/path.ts");
  });
});
