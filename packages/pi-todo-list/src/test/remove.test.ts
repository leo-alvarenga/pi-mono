import { describe, it, expect } from "vitest";
import { applyAction } from "../core";
import type { TodoState } from "../types";

const base = (): TodoState => ({
  todos: [
    { id: 1, text: "a", status: "pending", blockedBy: [] },
    { id: 2, text: "b", status: "pending", blockedBy: [1, 3] },
    { id: 3, text: "c", status: "pending", blockedBy: [] },
  ],
  nextId: 4,
});

describe("remove", () => {
  it("unknown id → ok: false", () => {
    expect(applyAction(base(), { action: "remove", id: 99 }).ok).toBe(false);
  });
  it("removeMany drops all listed ids", () => {
    const r = applyAction(base(), { action: "remove", ids: [1, 3] });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.state.todos.map((t) => t.id)).toEqual([2]);
  });
  it("removed ids stripped from siblings' blockedBy", () => {
    const r = applyAction(base(), { action: "remove", ids: [1, 3] });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.state.todos.find((t) => t.id === 2)!.blockedBy).toEqual([]);
  });
});
