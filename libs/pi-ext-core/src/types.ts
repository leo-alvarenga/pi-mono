import type { ThemeColor } from "@earendil-works/pi-coding-agent";

/** Generic status icon+color descriptor. Consumer: pi-mini-subagents, pi-todo-list. */
export type StatusUi = {
  icon: string;
  fg: ThemeColor;
  bold?: boolean;
  color?: ThemeColor;
  strikethrough?: boolean;
};

/** Collapsed/expanded icon pair for TUI panels. Consumer: pi-mini-subagents, pi-todo-list. */
export const PANEL_STATE_ICON = {
  collapsed: "󰅂",
  expanded: "󰅀",
} as const;

/** Generic token usage shape. Consumer: pi-mini-subagents, pi-status-broadcaster, pi-zen-frame. */
export type TokenUsage = {
  input: number;
  output: number;
  cacheRead?: number;
  cacheWrite?: number;
  cost?: number;
  total?: number;
};

/** Result of a headless agent run. Consumer: pi-mini-subagents. */
export type HeadlessRunResult = {
  output: string;
  usage: Required<Omit<TokenUsage, "total">> & {
    contextTokens: number;
    turns: number;
  };
  model?: string;
  stopReason?: string;
  errorMessage?: string;
  exitCode: number;
  stderr: string;
  aborted: boolean;
};

// Type-level assertion: extended variants must be assignable to StatusUi.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _statusUiCheck: StatusUi = {
  icon: "",
  fg: "text",
  color: "text",
  strikethrough: true,
};
