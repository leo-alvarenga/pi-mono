import assert from "node:assert/strict";
import { applyAction } from "./core";

// addMany appends all with sequential ids
const a = applyAction({ todos: [], nextId: 1 }, { action: "add", texts: ["one", "two", "three"] });
assert.equal(a.ok, true);
if (!a.ok) process.exit(1);
assert.deepEqual(a.state.todos.map((t) => t.id), [1, 2, 3]);
assert.deepEqual(a.state.todos.map((t) => t.text), ["one", "two", "three"]);
assert.equal(a.state.nextId, 4);

// blank entry rejects the whole batch
const bad = applyAction({ todos: [], nextId: 1 }, { action: "add", texts: ["", "ok"] });
assert.equal(bad.ok, false);

// removeMany drops each id (missing id errors, nothing changes)
const missing = applyAction(a.state, { action: "remove", ids: [99] });
assert.equal(missing.ok, false);
const r = applyAction(a.state, { action: "remove", ids: [1, 3] });
assert.equal(r.ok, true);
if (!r.ok) process.exit(1);
assert.deepEqual(r.state.todos.map((t) => t.id), [2]);

// removeMany strips dumped ids from a sibling's blockedBy
const withDep = {
  todos: [
    { id: 1, text: "a", status: "pending" as const, blockedBy: [] },
    { id: 2, text: "b", status: "pending" as const, blockedBy: [1, 3] },
    { id: 3, text: "c", status: "pending" as const, blockedBy: [] },
  ],
  nextId: 4,
};
const rr = applyAction(withDep, { action: "remove", ids: [1, 3] });
assert.equal(rr.ok, true);
if (!rr.ok) process.exit(1);
assert.deepEqual(rr.state.todos.find((t) => t.id === 2)!.blockedBy, []);

console.log("core.ts batch add/remove OK");
