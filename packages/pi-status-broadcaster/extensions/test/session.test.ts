import { describe, it, expect } from "vitest";
import { buildEntry } from "../session";
import type { ExtensionContext } from "@earendil-works/pi-coding-agent";

const fakeCtx = {
  cwd: "/home/user/project",
  model: { name: "claude-opus-5", id: "claude-opus-5" },
  getContextUsage: () => ({ tokens: 1000 }),
  sessionManager: {
    getSessionId: () => "sess-test",
    getEntries: () => [],
  },
} as unknown as ExtensionContext;

describe("buildEntry", () => {
  it("returned object has all required fields", () => {
    const entry = buildEntry(fakeCtx, {
      id: "sess-test",
      createdAt: new Date().toISOString(),
      status: "IDLE",
    });
    expect(entry).toHaveProperty("id", "sess-test");
    expect(entry).toHaveProperty("cwd");
    expect(entry).toHaveProperty("status");
    expect(entry).toHaveProperty("createdAt");
    expect(entry).toHaveProperty("tokens");
    expect(entry).toHaveProperty("currentModel");
    expect(entry).toHaveProperty("todos");
  });
  it("status IDLE passed through", () => {
    const entry = buildEntry(fakeCtx, {
      id: "1",
      createdAt: new Date().toISOString(),
      status: "IDLE",
    });
    expect(entry.status).toBe("IDLE");
  });
  it("status BUSY passed through", () => {
    const entry = buildEntry(fakeCtx, {
      id: "1",
      createdAt: new Date().toISOString(),
      status: "BUSY",
    });
    expect(entry.status).toBe("BUSY");
  });
  it("todos stub is always { done:0, created:0, inProgress:0 }", () => {
    const entry = buildEntry(fakeCtx, {
      id: "1",
      createdAt: new Date().toISOString(),
      status: "IDLE",
    });
    expect(entry.todos).toEqual({ done: 0, created: 0, inProgress: 0 });
  });
});
