import type { ThemeColor } from "@earendil-works/pi-coding-agent";

/** Streaming phase used to drive the status-animation spinner. */
export type SpinnerPhase =
  "thinking" | "outputting" | "toolcall" | "exec" | "idle";

export interface BannerTip {
  type: "Tip" | "Did You Know?" | "Workflow" | "Prompting";
  text: string;
}

export interface FrameColors {
  border: ThemeColor;
  background: ThemeColor;
  cwd: ThemeColor;
  model: ThemeColor;
  context: ThemeColor;
  thinking: ThemeColor;
  agentMode: ThemeColor;
}

/** Nerd-font / glyph icons shown in the frame border. Each is overridable. */
export interface FrameIcons {
  folder: string;
  model: string;
  context: string;
  thinking: string;
  gitDirty: string;
  gitBranch: string;
}

/**
 * ``frame`` — the rounded-corner shell look. Padding values are plain
 * numbers (>= 0): paddingTop/paddingBottom are blank lines shown *inside*
 * the box above/below the content.
 */
export interface FrameSettings {
  enable?: boolean;

  /** Below this terminal width the frame is skipped entirely (passthrough) */
  minWidth?: number;

  /** Blank lines inside the box above the content. Default 1. */
  paddingTop?: number;

  /** Blank lines inside the box below the content. Default 1. */
  paddingBottom?: number;

  /** Horizontal inner padding for the content rows. Default 1. */
  paddingX?: number;

  /** Blank rows OUTSIDE the box, above its top border. Default 0. */
  marginTop?: number;

  /** Blank rows OUTSIDE the box, below its bottom border. Default 0. */
  marginBottom?: number;

  showCwd?: boolean;
  showModel?: boolean;
  showContext?: boolean;
  showThinking?: boolean;
  showAgentMode?: boolean;

  /** Show the status-animation spinner segment while streaming. Default false. */
  showSpinner?: boolean;

  icons?: Partial<FrameIcons>;
  colors?: Partial<FrameColors>;

  /** ThemeColor used as the fg for all editor border characters; If set to `"agentMode"`, will follow the current Agent color. Default "border". */
  borderColor?: ThemeColor | "agentMode";

  /** Text shown before the editor content. Default "❯". */
  prefix?: string;

  /** ThemeColor used as the fg for the prefix text; If set to `"agentMode"`, will follow the current Agent color;
   * If set to `"frameBorder"`, will follow the border color. Default: text color. */
  prefixColor?: "agentMode" | "frameBorder" | ThemeColor;
}

/** `header` — the top-line header, which can show a logo or other text */
export interface HeaderSettings {
  logo: string[];
  enable: boolean;
  heading: string;
  subheading: string;
  logoColor: ThemeColor;
  accentColor: ThemeColor;
}

/** `workingMessage` — rotating messages in pi's built-in working loader. */
export interface WorkingMessageSettings {
  /** Toggle the rotating messages. Default true. */
  enable?: boolean;

  /** How often (ms) the message is replaced. Default 3000. */
  intervalMs?: number;

  /** Custom message pool; replaces the default 30. */
  messages?: string[];
}

export interface Settings {
  frame?: FrameSettings;
  header?: HeaderSettings;
  workingMessage?: WorkingMessageSettings;

  /** Master mute: every segment except agent-mode renders muted.
   *  Default true. Toggle at runtime with `/zen_mode` or the `piZenFrame.zenMode`
   *  keybinding (default `ctrl+shift+z`). */
  zenMode?: boolean;

  /** Accent color for the frame border and other highlights; Defaults to 'accent' */
  accentColor?: ThemeColor;
}
