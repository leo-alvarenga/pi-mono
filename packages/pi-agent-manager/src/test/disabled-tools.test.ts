import { describe, it, expect } from "vitest";
import { disabled } from "../permission/evaluate";
import type { Rule } from "../permission/types";

const toolToPermission: Record<string, string> = {
  bash: "exec",
  read: "read",
  write: "write",
};

describe("disabled", () => {
  it("tool with deny rule appears in returned Set", () => {
    const rules: Rule[] = [
      { permission: "exec", pattern: "*", action: "deny" },
    ];
    expect(disabled(["bash"], toolToPermission, rules).has("bash")).toBe(true);
  });
  it("tool with allow rule absent from Set", () => {
    const rules: Rule[] = [
      { permission: "exec", pattern: "*", action: "allow" },
    ];
    expect(disabled(["bash"], toolToPermission, rules).has("bash")).toBe(false);
  });
  it("tool not in toolToPermission map treated as ask, absent from disabled set", () => {
    const rules: Rule[] = [
      { permission: "exec", pattern: "*", action: "deny" },
    ];
    expect(
      disabled(["unknown-tool"], toolToPermission, rules).has("unknown-tool"),
    ).toBe(false);
  });
  it("multiple tools: only denied ones appear", () => {
    const rules: Rule[] = [
      { permission: "exec", pattern: "*", action: "deny" },
      { permission: "read", pattern: "*", action: "allow" },
    ];
    const result = disabled(["bash", "read"], toolToPermission, rules);
    expect(result.has("bash")).toBe(true);
    expect(result.has("read")).toBe(false);
  });
});
