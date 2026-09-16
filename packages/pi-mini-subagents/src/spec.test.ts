import assert from "node:assert/strict";

import { buildSystemPrompt, buildAllowlist } from "@leo-alvarenga/pi-ext-core";
import {
  NEEDS_INPUT_MARKER,
  NEEDS_INPUT_SUFFIX,
  READ_ONLY_TOOLS,
  WRITE_TOOLS,
  STATE_ENTRY,
  REPORT_ENTRY,
  WIDGET_KEY,
  PANEL_TOGGLE_CHORD,
} from "./constants";

const promptSpec = {
  promptInstructions: {
    always: "You are a transient subagent. Complete the task, then stop",
    readOnly: "You may only READ and EXPLORE. Do not modify files or run mutating commands.",
    writeAllowed: "You may edit files ONLY if strictly necessary, preferring hash-anchored operations (replace/insert) over rewriting.",
  },
  needsInput: { marker: NEEDS_INPUT_MARKER, suffix: NEEDS_INPUT_SUFFIX },
};

const allowlistSpec = {
  allowlists: { readOnly: READ_ONLY_TOOLS, writeable: WRITE_TOOLS },
};

// prompt includes the marker
{
  const ro = buildSystemPrompt(promptSpec, false);
  const rw = buildSystemPrompt(promptSpec, true);
  assert.ok(ro.includes(NEEDS_INPUT_MARKER), "read-only prompt must include marker");
  assert.ok(rw.includes(NEEDS_INPUT_MARKER), "write prompt must include marker");
  assert.equal(ro.includes("You may edit files"), false);
  assert.equal(rw.includes("You may edit files"), true);
}

// write allowlist includes replace and write
assert.ok(buildAllowlist(allowlistSpec, true).includes("replace"));
assert.ok(buildAllowlist(allowlistSpec, true).includes("write"));

// contract constants
assert.equal(STATE_ENTRY, "subagents.state");
assert.equal(REPORT_ENTRY, "subagents.report");
assert.equal(WIDGET_KEY, "subagents");
assert.equal(PANEL_TOGGLE_CHORD, "alt+s");

console.log("pi-mini-subagents spec contract OK");
