import { describe, it, expect } from "vitest";
import { applyAction } from "../core";
import type { TodoState } from "../types";

const base = (): TodoState => ({
  todos: [
    { id: 1, text: "task a", status: "pending", blockedBy: [] },
    { id: 2, text: "task b", status: "pending", blockedBy: [] },
  ],
  nextId: 3,
});

describe("update", () => {
  it("no patch fields → nothing to update error", () => {
    const r = applyAction(base(), { action: "update", id: 1 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("nothing to update");
  });
  it("unknown id → todo #N not found", () => {
    const r = applyAction(base(), { action: "update", id: 99, text: "x" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("#99 not found");
  });
  it("blank text → text cannot be empty", () => {
    const r = applyAction(base(), { action: "update", id: 1, text: "" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("text cannot be empty");
  });
  it("text > 120 chars → length error", () => {
    expect(applyAction(base(), { action: "update", id: 1, text: "x".repeat(121) }).ok).toBe(false);
  });
  it("self-referencing blockedBy → task cannot block itself", () => {
    const r = applyAction(base(), { action: "update", id: 1, blockedBy: [1] });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("block itself");
  });
  it("blockedBy references unknown id → error", () => {
    expect(applyAction(base(), { action: "update", id: 1, blockedBy: [99] }).ok).toBe(false);
  });
  it("duplicate ids in blockedBy silently deduplicated", () => {
    const r = applyAction(base(), { action: "update", id: 1, blockedBy: [2, 2] });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.state.todos.find((t) => t.id === 1)!.blockedBy).toEqual([2]);
  });
  it("direct cycle A→B→A detected", () => {
    const s: TodoState = {
      todos: [
        { id: 1, text: "a", status: "pending", blockedBy: [2] },
        { id: 2, text: "b", status: "pending", blockedBy: [] },
      ],
      nextId: 3,
    };
    expect(applyAction(s, { action: "update", id: 2, blockedBy: [1] }).ok).toBe(false);
  });
  it("indirect cycle A→B→C→A detected", () => {
    const s: TodoState = {
      todos: [
        { id: 1, text: "a", status: "pending", blockedBy: [2] },
        { id: 2, text: "b", status: "pending", blockedBy: [3] },
        { id: 3, text: "c", status: "pending", blockedBy: [] },
      ],
      nextId: 4,
    };
    expect(applyAction(s, { action: "update", id: 3, blockedBy: [1] }).ok).toBe(false);
  });
  it("status update with no other fields succeeds", () => {
    expect(applyAction(base(), { action: "update", id: 1, status: "completed" }).ok).toBe(true);
  });
});
