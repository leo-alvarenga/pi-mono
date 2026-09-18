import { describe, it, expect } from "vitest";
import { applyAction } from "../core";
import type { TodoState } from "../types";

const withItems = (): TodoState => ({
  todos: [
    { id: 1, text: "task", status: "pending", blockedBy: [] },
    { id: 2, text: "other", status: "in-progress", blockedBy: [] },
  ],
  nextId: 3,
});

describe("list", () => {
  it("returns all todos unchanged", () => {
    const r = applyAction(withItems(), { action: "list" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.state.todos).toHaveLength(2);
  });
});

describe("clear", () => {
  it("resets todos to [] and nextId to 1", () => {
    const r = applyAction(withItems(), { action: "clear" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.state.todos).toEqual([]);
    expect(r.state.nextId).toBe(1);
  });
});
