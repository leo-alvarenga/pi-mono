import assert from "node:assert/strict";
import * as fs from "node:fs";

import { createEventReducer } from "./events";
import { getPiInvocation } from "./invocation";

// --- createEventReducer ---

function makeMessageEnd(role: string, opts: {
  text?: string;
  input?: number;
  output?: number;
  model?: string;
  stopReason?: string;
}): string {
  return JSON.stringify({
    type: "message_end",
    message: {
      role,
      usage: { input: opts.input ?? 0, output: opts.output ?? 0, cacheRead: 0, cacheWrite: 0, cost: { total: 0 }, totalTokens: 0 },
      model: opts.model,
      stopReason: opts.stopReason,
      content: opts.text ? [{ type: "text", text: opts.text }] : [],
    },
  });
}

// Single assistant message_end
{
  const r = createEventReducer();
  r.feed(makeMessageEnd("assistant", { text: "hello", input: 10, output: 5, model: "m1", stopReason: "end_turn" }) + "\n");
  r.end();
  assert.equal(r.result.output, "hello");
  assert.equal(r.result.usage.turns, 1);
  assert.equal(r.result.usage.input, 10);
  assert.equal(r.result.usage.output, 5);
  assert.equal(r.result.model, "m1");
  assert.equal(r.result.stopReason, "end_turn");
}

// Non-assistant role is ignored
{
  const r = createEventReducer();
  r.feed(makeMessageEnd("user", { text: "ignored", input: 99 }) + "\n");
  r.end();
  assert.equal(r.result.usage.turns, 0);
  assert.equal(r.result.output, "");
}

// Malformed JSON lines are tolerated
{
  const r = createEventReducer();
  r.feed("not-json\n");
  r.feed("{broken\n");
  r.feed(makeMessageEnd("assistant", { text: "ok" }) + "\n");
  r.end();
  assert.equal(r.result.output, "ok");
  assert.equal(r.result.usage.turns, 1);
}

// Multiple turns accumulate
{
  const r = createEventReducer();
  r.feed(makeMessageEnd("assistant", { text: "first", input: 10, output: 5 }) + "\n");
  r.feed(makeMessageEnd("assistant", { text: "second", input: 20, output: 8 }) + "\n");
  r.end();
  assert.equal(r.result.usage.turns, 2);
  assert.equal(r.result.usage.input, 30);
  assert.equal(r.result.usage.output, 13);
  assert.equal(r.result.output, "second");
}

// Chunk boundary splitting a JSON object
{
  const r = createEventReducer();
  const line = makeMessageEnd("assistant", { text: "split" });
  const mid = Math.floor(line.length / 2);
  r.feed(line.slice(0, mid));
  r.feed(line.slice(mid) + "\n");
  r.end();
  assert.equal(r.result.output, "split");
}

// Remaining buffer flushed on end()
{
  const r = createEventReducer();
  // No trailing newline — must be flushed by end()
  r.feed(makeMessageEnd("assistant", { text: "flushed" }));
  r.end();
  assert.equal(r.result.output, "flushed");
}

// --- getPiInvocation ---

// When process.argv[1] is a real file, should use execPath + script
{
  const inv = getPiInvocation(["--mode", "json"]);
  const script = process.argv[1];
  if (script && fs.existsSync(script)) {
    assert.equal(inv.command, process.execPath);
    assert.ok(inv.args.includes(script));
    assert.ok(inv.args.includes("--mode"));
  } else {
    // Fallback: either execPath (named binary) or "pi"
    assert.ok(typeof inv.command === "string");
  }
}

console.log("pi-ext-core headless/events + invocation OK");
