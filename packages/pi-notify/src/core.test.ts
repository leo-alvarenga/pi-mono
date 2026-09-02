import assert from "node:assert/strict";

import { createNotifier, type Notifier } from "./notifier";
import { parseArgs } from "./state";
import { formatDuration, RunTracker } from "./tracker";

function fake(): { calls: string[][]; notifier: Notifier } {
  const calls: string[][] = [];
  return { calls, notifier: { notify: (summary, body) => calls.push([summary, body]) } };
}

// parseArgs
assert.deepEqual(parseArgs("", false), { kind: "toggle", next: true });
assert.deepEqual(parseArgs("ON", false), { kind: "set", next: true });
assert.deepEqual(parseArgs("off ", true), { kind: "set", next: false });
assert.deepEqual(parseArgs("status", true), { kind: "status", enabled: true });
assert.equal(parseArgs("gibberish", true).kind, "invalid");

// formatDuration
assert.equal(formatDuration(0), "<1s");
assert.equal(formatDuration(45_000), "45s");
assert.equal(formatDuration(134_000), "2m 14s");
assert.equal(formatDuration(3_900_000), "1h 5m");

// disabled -> no notification
{
  const { calls, notifier } = fake();
  const t = new RunTracker(() => false, notifier, () => "/tmp/proj");
  t.begin();
  t.settle("3f9c2a81");
  assert.equal(calls.length, 0);
}

// enabled -> one notification carrying the session label in the title
{
  const { calls, notifier } = fake();
  const t = new RunTracker(() => true, notifier, () => "/tmp/myrepo");
  t.begin();
  t.settle("3f9c2a81");
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], "Pi 3f9c2a81 done");
  assert.match(calls[0][1], /Finished in .* · myrepo/);
}

// settle without begin is silent; a double settle sends one notification
{
  const { calls, notifier } = fake();
  const t = new RunTracker(() => true, notifier, () => "/p");
  t.settle("3f9c2a81");
  assert.equal(calls.length, 0);
  t.begin();
  t.settle("3f9c2a81");
  t.settle("3f9c2a81");
  assert.equal(calls.length, 1);
}

// non-linux platform -> no-op notifier that does not throw
{
  const n = createNotifier("darwin");
  n.notify("x", "y");
  assert.equal(typeof n.notify, "function");
}

console.log("pi-notify core OK");