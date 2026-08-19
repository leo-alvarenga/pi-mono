import assert from "node:assert/strict";
import { test } from "node:test";
import { applyAction, wouldCreateCycle } from "./core";
import type { ActionResult, TodoState } from "./types";

const init = (): TodoState => ({ todos: [], nextId: 1 });

const ok = (r: ActionResult): TodoState => {
  assert.equal(r.ok, true, r.ok ? "" : (r as { error: string }).error);
  return (r as { state: TodoState }).state;
};

test("add, update, remove roundtrip", () => {
  let s = init();
  s = ok(applyAction(s, { action: "add", text: "  first  " }));
  assert.deepEqual(s.todos, [
    { id: 1, text: "first", status: "pending", blockedBy: [] },
  ]);

  s = ok(applyAction(s, { action: "update", id: 1, status: "completed" }));
  assert.equal(s.todos[0].status, "completed");

  s = ok(applyAction(s, { action: "remove", id: 1 }));
  assert.deepEqual(s.todos, []);

  assert.deepEqual(applyAction(s, { action: "list" }).text, "No todos");
});

test("validation: empty text, unknown id, self-block", () => {
  const s = ok(applyAction(init(), { action: "add", text: "a" }));

  const empty = applyAction(s, { action: "add", text: "   " });
  assert.deepEqual(empty, { ok: false, error: "text required for add" });

  const missing = applyAction(s, { action: "update", id: 99, status: "done" });
  assert.deepEqual(missing, { ok: false, error: "todo #99 not found" });

  const selfBlock = applyAction(s, { action: "update", id: 1, blockedBy: [1] });
  assert.deepEqual(selfBlock, { ok: false, error: "task cannot block itself" });
});

test("dependency cycles are rejected", () => {
  let s = init();
  s = ok(applyAction(s, { action: "add", text: "a" }));
  s = ok(applyAction(s, { action: "add", text: "b" }));
  s = ok(applyAction(s, { action: "update", id: 1, blockedBy: [2] }));
  assert.equal(wouldCreateCycle(s.todos, 1), false);

  const cycle = applyAction(s, { action: "update", id: 2, blockedBy: [1] });
  assert.deepEqual(cycle, { ok: false, error: "would create a dependency cycle" });
});