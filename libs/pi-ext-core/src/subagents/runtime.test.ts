import assert from "node:assert/strict";

import {
  buildAllowlist,
  buildSystemPrompt,
  classifyResult,
  parseNeedsInput,
} from "./runtime";

const MARKER = "NEEDS_INPUT:";

const minimalSpec = {
  promptInstructions: {
    always: "You are a transient subagent. Complete the task, then stop",
    readOnly: "You may only READ and EXPLORE. Do not modify files or run mutating commands.",
    writeAllowed: "You may edit files ONLY if strictly necessary, preferring hash-anchored operations (replace/insert) over rewriting.",
  },
  needsInput: {
    marker: MARKER,
    suffix: `If the task cannot be completed without information you cannot obtain yourself, end your final message with the exact block below and stop — do not guess:\n\n${MARKER}\n- <question>\n\nReport your findings clearly and concisely.`,
  },
  allowlists: {
    readOnly: ["read", "grep", "find", "ls"],
    writeable: ["read", "grep", "find", "ls", "replace", "insert", "edit", "write"],
  },
};

// buildSystemPrompt: read-only vs write grant
{
  const ro = buildSystemPrompt(minimalSpec, false);
  const rw = buildSystemPrompt(minimalSpec, true);
  assert.equal(ro.includes("You may edit files"), false);
  assert.equal(rw.includes("You may edit files"), true);
  assert.ok(ro.includes(MARKER) && rw.includes(MARKER));
}

// buildAllowlist
{
  assert.deepEqual(buildAllowlist(minimalSpec, false), ["read", "grep", "find", "ls"]);
  assert.equal(buildAllowlist(minimalSpec, true).includes("write"), true);
  assert.equal(buildAllowlist(minimalSpec, true).includes("replace"), true);
}

// parseNeedsInput
{
  assert.equal(parseNeedsInput("all done", MARKER), undefined);
  assert.deepEqual(
    parseNeedsInput(`blah\n${MARKER}\n- who?\n- where?\n`, MARKER),
    ["who?", "where?"],
  );
  assert.deepEqual(parseNeedsInput(`${MARKER}\n`, MARKER), []);
}

// classifyResult
{
  assert.equal(classifyResult({ exitCode: 0, needsInput: true }), "needs_input");
  assert.equal(classifyResult({ exitCode: 0, needsInput: false }), "completed");
  assert.equal(classifyResult({ exitCode: 1, needsInput: false }), "failed");
  assert.equal(
    classifyResult({ exitCode: 0, stopReason: "error", needsInput: false }),
    "failed",
  );
  assert.equal(
    classifyResult({ exitCode: 0, stopReason: "aborted", needsInput: false }),
    "failed",
  );
}

console.log("pi-ext-core subagents/runtime helpers OK");
