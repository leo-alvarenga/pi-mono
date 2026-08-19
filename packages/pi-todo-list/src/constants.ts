import type { KeyId } from "@earendil-works/pi-tui";
import { TodoStatus, TodoStatusUi } from "./types";

/** Task statuses, in lifecycle order. All limits are hardcoded — no config files. */
export const STATUSES = ["pending", "in-progress", "completed"] as const;

export const STATUS_STYLES: Record<TodoStatus, TodoStatusUi> = {
  pending: { icon: " ", fg: "text", color: "text" },
  "in-progress": { icon: "󱥸 ", fg: "accent", color: "accent", bold: true },
  completed: { icon: " ", fg: "dim", color: "success", strikethrough: true },
};

/** Max task rows rendered in the expanded TUI widget. */
export const MAX_PANEL_ROWS = 8;

/** Max characters per task text. */
export const MAX_TEXT_LENGTH = 120;

/** Widget key for the panel above the editor. */
export const WIDGET_KEY = "todos";

/** Custom entry type carrying the durable state snapshot. */
export const STATE_ENTRY = "todos.state";

/** Custom entry type rendered by the /todos command. */
export const REPORT_ENTRY = "todos.report";

/** Chord that toggles the panel. Chosen in setup: free in pi's default keybindings. */
export const PANEL_TOGGLE_CHORD: KeyId = "alt+t";

export const PANEL_STATE_ICON = {
  collapsed: "󰅂",
  expanded: "󰅀",
};
