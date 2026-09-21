import { describe, it, expect } from "vitest";
import {
  STATE_ENTRY,
  REPORT_ENTRY,
  WIDGET_KEY,
  PANEL_TOGGLE_CHORD,
  MAX_PARALLEL_TASKS,
  MAX_CONCURRENCY,
} from "../constants";

describe("protocol constants (public contract: must not silently drift)", () => {
  it("STATE_ENTRY", () => expect(STATE_ENTRY).toBe("subagents.state"));
  it("REPORT_ENTRY", () => expect(REPORT_ENTRY).toBe("subagents.report"));
  it("WIDGET_KEY", () => expect(WIDGET_KEY).toBe("subagents"));
  it("PANEL_TOGGLE_CHORD", () => expect(PANEL_TOGGLE_CHORD).toBe("alt+s"));
  it("MAX_PARALLEL_TASKS", () => expect(MAX_PARALLEL_TASKS).toBe(8));
  it("MAX_CONCURRENCY", () => expect(MAX_CONCURRENCY).toBe(4));
});
