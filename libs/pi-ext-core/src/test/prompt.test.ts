import { describe, it, expect } from "vitest";
import { buildSystemPrompt, buildAllowlist } from "../subagents/prompt";

const spec = {
  promptInstructions: {
    always: "You are a transient subagent.",
    readOnly: "Only read and explore. Do not modify anything.",
    writeAllowed: "You may edit files if strictly necessary.",
  },
  needsInput: {
    marker: "NEEDS_INPUT:",
    suffix: "If you need more info:\nNEEDS_INPUT:\n- <question>",
  },
  allowlists: {
    readOnly: ["read", "grep", "find", "ls"],
    writeable: ["read", "grep", "find", "ls", "replace", "write"],
  },
};

describe("buildSystemPrompt", () => {
  it("read-only prompt excludes write instructions", () => {
    expect(buildSystemPrompt(spec, false).includes("edit files")).toBe(false);
  });
  it("write-enabled prompt includes write instructions", () => {
    expect(buildSystemPrompt(spec, true).includes("edit files")).toBe(true);
  });
  it("both prompts include NEEDS_INPUT marker", () => {
    expect(buildSystemPrompt(spec, false)).toContain("NEEDS_INPUT:");
    expect(buildSystemPrompt(spec, true)).toContain("NEEDS_INPUT:");
  });
});

describe("buildAllowlist", () => {
  it("allowWrite=true includes replace and write", () => {
    const list = buildAllowlist(spec, true);
    expect(list).toContain("replace");
    expect(list).toContain("write");
  });
  it("allowWrite=false does not include replace", () => {
    expect(buildAllowlist(spec, false)).not.toContain("replace");
  });
});
