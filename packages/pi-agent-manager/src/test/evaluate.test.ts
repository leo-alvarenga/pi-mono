import { describe, it, expect } from "vitest";
import { evaluate } from "../permission/evaluate";
import type { Ruleset } from "../permission/types";

describe("evaluate", () => {
  it("last-match-wins: later ruleset overrides earlier", () => {
    const rs1: Ruleset = [{ permission: "read", pattern: "*", action: "allow" }];
    const rs2: Ruleset = [{ permission: "read", pattern: "*", action: "deny" }];
    expect(evaluate("read", "file.ts", rs1, rs2).action).toBe("deny");
  });
  it("no match → synthetic ask rule returned", () => {
    expect(evaluate("write", "anywhere", []).action).toBe("ask");
  });
  it("multiple overlapping rules: last matching one applies", () => {
    const rs: Ruleset = [
      { permission: "*", pattern: "*", action: "allow" },
      { permission: "write", pattern: "*", action: "deny" },
      { permission: "write", pattern: "*", action: "ask" },
    ];
    expect(evaluate("write", "file.ts", rs).action).toBe("ask");
  });
  it("wildcard permission matches concrete tool", () => {
    const rs: Ruleset = [{ permission: "*", pattern: "*", action: "allow" }];
    expect(evaluate("bash", "*", rs).action).toBe("allow");
  });
});
