import type { KeyId } from "@earendil-works/pi-tui";
import type { StatusUi, SubagentStatus } from "@leo-alvarenga/pi-ext-core";

export const STATUSES = [
  "running",
  "completed",
  "failed",
  "needs_input",
] as const;

export const STATUS_STYLES: Record<SubagentStatus, StatusUi> = {
  running: { icon: "󱥸 ", fg: "accent", bold: true },
  completed: { icon: "✓ ", fg: "success" },
  failed: { icon: "✗ ", fg: "error", bold: true },
  needs_input: { icon: "? ", fg: "warning", bold: true },
};

/** Marker the subagent emits when it cannot proceed without outside input. */
export const NEEDS_INPUT_MARKER = "NEEDS_INPUT:";

/** Prompt suffix block that instructs the subagent to use the marker. */
export const NEEDS_INPUT_SUFFIX = `If the task cannot be completed without information you cannot obtain yourself, end your final message with the exact block below and stop — do not guess:

${NEEDS_INPUT_MARKER}
- <question>

Report your findings clearly and concisely.`;

/** Max parallel tasks per call */
export const MAX_PARALLEL_TASKS = 12;

/** Max concurrent subagent processes */
export const MAX_CONCURRENCY = 8;

/** Per-task output byte cap for parallel results */
export const PER_TASK_OUTPUT_CAP = 80 * 1024;

/** Max chars of final output kept in the stored record (TUI summary) */
export const MAX_STORED_OUTPUT = 2000;

export const MAX_WRITES_PER_SUBAGENT = 4;

/** Max task rows rendered in the expanded TUI widget */
export const MAX_PANEL_ROWS = 8;

/** Widget key for the panel above the editor */
export const WIDGET_KEY = "subagents";

/** Custom entry type carrying the durable state snapshot */
export const STATE_ENTRY = "subagents.state";

/** Custom entry type rendered by the /subagents command */
export const REPORT_ENTRY = "subagents.report";

/** Chord that toggles the panel */
export const PANEL_TOGGLE_CHORD: KeyId = "alt+s";
