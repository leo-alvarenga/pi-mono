import type { KeyId } from "@earendil-works/pi-tui";
import type { ThemeColor } from "@earendil-works/pi-coding-agent";

import type { SubagentStatus } from "./types";

export type SubagentStatusUi = {
  icon: string;
  fg: ThemeColor;
  bold?: boolean;
};

export const STATUSES = [
  "running",
  "completed",
  "failed",
  "needs_input",
] as const;

export const STATUS_STYLES: Record<SubagentStatus, SubagentStatusUi> = {
  running: { icon: "⏳ ", fg: "accent", bold: true },
  completed: { icon: "✓ ", fg: "success" },
  failed: { icon: "✗ ", fg: "error", bold: true },
  needs_input: { icon: "? ", fg: "warning", bold: true },
};

/** Tool allowlist for a read-only subagent. */
export const READ_ONLY_TOOLS = ["read", "grep", "find", "ls"];

/** Tool allowlist for a write-capable subagent (hash-anchored ops first). */
export const WRITE_TOOLS = [
  "read",
  "grep",
  "find",
  "ls",
  "replace",
  "insert",
  "edit",
  "write",
];

/** Marker the subagent emits when it cannot proceed without outside input. */
export const NEEDS_INPUT_MARKER = "NEEDS_INPUT:";

/** Max parallel tasks per call. */
export const MAX_PARALLEL_TASKS = 8;
/** Max concurrent subagent processes. */
export const MAX_CONCURRENCY = 4;
/** Per-task output byte cap for parallel results. */
export const PER_TASK_OUTPUT_CAP = 50 * 1024;
/** Max chars of final output kept in the stored record (TUI summary). */
export const MAX_STORED_OUTPUT = 2000;

/** Max task rows rendered in the expanded TUI widget. */
export const MAX_PANEL_ROWS = 8;

/** Widget key for the panel above the editor. */
export const WIDGET_KEY = "subagents";

/** Custom entry type carrying the durable state snapshot. */
export const STATE_ENTRY = "subagents.state";

/** Custom entry type rendered by the /subagents command. */
export const REPORT_ENTRY = "subagents.report";

/** Chord that toggles the panel. */
export const PANEL_TOGGLE_CHORD: KeyId = "alt+s";

export const PANEL_STATE_ICON = {
  collapsed: "󰅂",
  expanded: "󰅀",
};
