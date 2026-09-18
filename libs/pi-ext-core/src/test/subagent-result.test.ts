import { describe, it, expect } from "vitest";
import { classifyResult } from "../subagents/result";

describe("classifyResult", () => {
  it("needsInput=true → needs_input regardless of exit code", () => {
    expect(classifyResult({ exitCode: 0, needsInput: true })).toBe(
      "needs_input",
    );
    expect(classifyResult({ exitCode: 1, needsInput: true })).toBe(
      "needs_input",
    );
  });
  it("exitCode≠0 → failed", () => {
    expect(classifyResult({ exitCode: 1, needsInput: false })).toBe("failed");
  });
  it("stopReason=aborted with exitCode=0 → failed", () => {
    expect(
      classifyResult({ exitCode: 0, stopReason: "aborted", needsInput: false }),
    ).toBe("failed");
  });
  it("exitCode=0, no special reason → completed", () => {
    expect(classifyResult({ exitCode: 0, needsInput: false })).toBe(
      "completed",
    );
  });
});
