import type { ThemeColor } from "@earendil-works/pi-coding-agent";

/** Generic status icon+color descriptor */
export type StatusUi = {
  icon: string;
  fg: ThemeColor;
  bold?: boolean;
  color?: ThemeColor;
  strikethrough?: boolean;
};

/** Collapsed/expanded icon pair for TUI panels */
export const PANEL_STATE_ICON = {
  collapsed: "󰅂",
  expanded: "󰅀",
} as const;

/** Generic token usage shape */
export type TokenUsage = {
  cost?: number;
  input: number;
  output: number;
  total?: number;
  cacheRead?: number;
  cacheWrite?: number;
};
