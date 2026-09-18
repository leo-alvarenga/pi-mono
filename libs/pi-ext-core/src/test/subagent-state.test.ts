import { describe, it, expect } from "vitest";
import { stateStart, stateFinish } from "../subagents/state";
import type { SubagentState } from "../subagents/types";
import type { SessionRecordStore } from "../session/types";
import type { ExtensionContext } from "@earendil-works/pi-coding-agent";

function makeStore(
  initial: SubagentState = { nextId: 1, records: [] },
): SessionRecordStore<SubagentState> {
  let state = initial;
  return {
    getState: () => state,
    commit: (_, next) => {
      state = next;
    },
    replay: () => {},
    persistSnapshot: () => {},
  };
}

const ctx = {
  sessionManager: { getSessionId: () => "test-session" },
} as unknown as ExtensionContext;

describe("stateStart (pending → running)", () => {
  it("creates record with status running", () => {
    const store = makeStore();
    const record = stateStart(store, ctx, "do something", false);
    expect(record.status).toBe("running");
  });
  it("increments nextId for each task", () => {
    const store = makeStore();
    stateStart(store, ctx, "task 1", false);
    stateStart(store, ctx, "task 2", false);
    expect(store.getState(ctx).nextId).toBe(3);
  });
  it("appends record to store", () => {
    const store = makeStore();
    stateStart(store, ctx, "task", false);
    expect(store.getState(ctx).records).toHaveLength(1);
  });
});

describe("stateFinish transitions", () => {
  it("running → completed", () => {
    const store = makeStore();
    const r = stateStart(store, ctx, "task", false);
    stateFinish(store, ctx, r.id, { status: "completed" });
    expect(store.getState(ctx).records[0].status).toBe("completed");
  });
  it("running → failed", () => {
    const store = makeStore();
    const r = stateStart(store, ctx, "task", false);
    stateFinish(store, ctx, r.id, { status: "failed" });
    expect(store.getState(ctx).records[0].status).toBe("failed");
  });
  it("running → needs_input", () => {
    const store = makeStore();
    const r = stateStart(store, ctx, "task", false);
    stateFinish(store, ctx, r.id, { status: "needs_input" });
    expect(store.getState(ctx).records[0].status).toBe("needs_input");
  });
  it("unknown id patch is ignored (no record changed)", () => {
    const store = makeStore();
    stateStart(store, ctx, "task", false);
    stateFinish(store, ctx, 999, { status: "completed" });
    expect(store.getState(ctx).records[0].status).toBe("running");
  });
});
