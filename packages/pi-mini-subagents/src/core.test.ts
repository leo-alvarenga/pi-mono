import assert from "node:assert/strict";

import { buildAllowlist, buildSystemPrompt, classifyResult, parseNeedsInput, truncateBytes } from "./core";
import { NEEDS_INPUT_MARKER } from "./constants";

// read-only prompt has no write grant; write prompt does
const ro = buildSystemPrompt(false);
const rw = buildSystemPrompt(true);
assert.equal(ro.includes("You may edit files"), false);
assert.equal(rw.includes("You may edit files"), true);
assert.ok(ro.includes(NEEDS_INPUT_MARKER) && rw.includes(NEEDS_INPUT_MARKER));

// allowlists
assert.deepEqual(buildAllowlist(false), ["read", "grep", "find", "ls"]);
assert.equal(buildAllowlist(true).includes("write"), true);
assert.equal(buildAllowlist(true).includes("replace"), true);

// needs-input parsing
assert.equal(parseNeedsInput("all done"), undefined);
assert.deepEqual(parseNeedsInput(`blah\n${NEEDS_INPUT_MARKER}\n- who?\n- where?\n`), ["who?", "where?"]);
assert.deepEqual(parseNeedsInput(`${NEEDS_INPUT_MARKER}\n`), []);

// classification
assert.equal(classifyResult({ exitCode: 0, needsInput: true }), "needs_input");
assert.equal(classifyResult({ exitCode: 0, needsInput: false }), "completed");
assert.equal(classifyResult({ exitCode: 1, needsInput: false }), "failed");
assert.equal(classifyResult({ exitCode: 0, stopReason: "error", needsInput: false }), "failed");

// byte truncation
assert.equal(truncateBytes("abc", 100), "abc");
assert.ok(truncateBytes("x".repeat(1000), 10).includes("truncated"));

console.log("core.ts prompt/allowlist/parse/classify/truncate OK");
