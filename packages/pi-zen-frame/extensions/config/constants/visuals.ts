import type { ThemeColor } from "@earendil-works/pi-coding-agent";
import type { FrameIcons, SpinnerPhase } from "../types";
/** Spinner animation frames per phase (pi-editor-shell style). */
export const SPINNER_FRAMES: Record<SpinnerPhase, string[]> = {
  idle: ["⠃", "⠞", "⡵", "⠿", "⢹", "⠄"],
  outputting: ["⠋", "⠙", "⠸", "⠴", "⠦", "⠇", "⠏"],
  thinking: ["󰌶", "󰌶", "󰌶", "󰌶", "󰌵", "󰌵", "󰌵", "󰌵"],
  toolcall: ["●", "●", "●", "●", "○", "○", "○", "○"],
  exec: ["⠂", "⠅", "⠍", "⠟", "⠿", "⠽", "⠿", "⠟", "⠍", "⠅", "⠂"],

  // Sample ["░", "▒", "▓", "█", "▓", "▒"],
};

/** Nerd Font glyphs used by the blocky editor preset. */
export const DEFAULT_ICONS: FrameIcons = {
  model: "󰣖",
  folder: " ",
  tokenIn: "",
  context: "",
  tokenOut: "",
  gitDirty: "",
  thinking: "󰌶",
  gitBranch: "",
  bell: "󰂚",
  bellOff: "󰂛",
};

/** Thinking level → theme token, mirroring pi's own border-color mapping. */
export const THINKING_TOKEN: Record<string, string> = {
  off: "thinkingOff",
  minimal: "thinkingMinimal",
  low: "thinkingLow",
  medium: "thinkingMedium",
  high: "thinkingHigh",
  xhigh: "thinkingXhigh",
  max: "thinkingMax",
};

export const THEME_COLORS: Record<ThemeColor, true> = {
  accent: true,
  border: true,
  borderAccent: true,
  borderMuted: true,
  success: true,
  error: true,
  warning: true,
  muted: true,
  dim: true,
  text: true,
  searchMatchText: true,
  thinkingText: true,
  userMessageText: true,
  customMessageText: true,
  customMessageLabel: true,
  toolTitle: true,
  toolOutput: true,
  mdHeading: true,
  mdLink: true,
  mdLinkUrl: true,
  mdCode: true,
  mdCodeBlock: true,
  mdCodeBlockBorder: true,
  mdQuote: true,
  mdQuoteBorder: true,
  mdHr: true,
  mdListBullet: true,
  toolDiffAdded: true,
  toolDiffRemoved: true,
  toolDiffContext: true,
  syntaxComment: true,
  syntaxKeyword: true,
  syntaxFunction: true,
  syntaxVariable: true,
  syntaxString: true,
  syntaxNumber: true,
  syntaxType: true,
  syntaxOperator: true,
  syntaxPunctuation: true,
  thinkingOff: true,
  thinkingMinimal: true,
  thinkingLow: true,
  thinkingMedium: true,
  thinkingHigh: true,
  thinkingXhigh: true,
  thinkingMax: true,
  bashMode: true,
};
