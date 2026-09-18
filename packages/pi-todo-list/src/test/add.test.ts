import { describe, it, expect } from "vitest";
import { applyAction } from "../core";

const empty = (): { todos: never[]; nextId: number } => ({
  todos: [],
  nextId: 1,
});

describe("add", () => {
  it("auto-increments id, status defaults to pending, blockedBy is []", () => {
    const r = applyAction(empty(), { action: "add", text: "task one" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.state.todos[0]).toMatchObject({
      id: 1,
      status: "pending",
      blockedBy: [],
    });
  });
  it("blank text rejected", () => {
    expect(applyAction(empty(), { action: "add", text: "" }).ok).toBe(false);
  });
  it("text exceeding 120 chars rejected", () => {
    expect(
      applyAction(empty(), { action: "add", text: "x".repeat(121) }).ok,
    ).toBe(false);
  });
});

describe("addMany", () => {
  it("ids are sequential starting from nextId", () => {
    const r = applyAction(empty(), { action: "add", texts: ["a", "b", "c"] });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.state.todos.map((t) => t.id)).toEqual([1, 2, 3]);
  });
  it("all-or-nothing: any invalid entry rejects the batch", () => {
    expect(applyAction(empty(), { action: "add", texts: ["ok", ""] }).ok).toBe(
      false,
    );
  });
  it("nextId advances by the count of added items", () => {
    const r = applyAction(empty(), { action: "add", texts: ["a", "b"] });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.state.nextId).toBe(3);
  });
});
