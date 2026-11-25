import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { buildDefaultBwrapArgs } from "../utils/bwrap";

describe("buildDefaultBwrapArgs (agent dir)", () => {
  let dir: string;
  let prev: string | undefined;

  beforeEach(() => {
    prev = process.env.PI_CODING_AGENT_DIR;
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "pi-agent-"));
    process.env.PI_CODING_AGENT_DIR = dir;
    fs.mkdirSync(path.join(dir, "extensions"));
  });

  afterEach(() => {
    if (prev === undefined) delete process.env.PI_CODING_AGENT_DIR;
    else process.env.PI_CODING_AGENT_DIR = prev;
    fs.rmSync(dir, { recursive: true, force: true });
  });

  const hasTriple = (args: string[], flag: string, p: string) =>
    args.some((a, i) => a === flag && args[i + 1] === p && args[i + 2] === p);

  it("binds the agent dir writable even when allowWrite is false", () => {
    const args = buildDefaultBwrapArgs("/work", false);
    expect(hasTriple(args, "--bind", dir)).toBe(true);
    expect(hasTriple(args, "--bind", "/work")).toBe(false);
  });

  it("re-protects existing executable subdirs after the writable bind", () => {
    const args = buildDefaultBwrapArgs("/work", false);
    const ext = path.join(dir, "extensions");
    expect(hasTriple(args, "--ro-bind", ext)).toBe(true);
    expect(args.indexOf(ext)).toBeGreaterThan(args.indexOf(dir));
  });

  it("skips read-only overlays for subdirs that do not exist", () => {
    const args = buildDefaultBwrapArgs("/work", false);
    expect(args.includes(path.join(dir, "npm"))).toBe(false);
  });
});
