import type { ThemeColor } from "@earendil-works/pi-coding-agent";

/** Streaming phase used to drive the status-animation spinner. */
export type SpinnerPhase =
  "thinking" | "outputting" | "toolcall" | "exec" | "idle";

export interface BannerTip {
  type: "Tip" | "Did You Know?" | "Workflow" | "Prompting";
  text: string;
}

/** Nerd-font / glyph icons shown in the band and status rows. Overridable. */
export interface FrameIcons {
  folder: string;
  model: string;
  context: string;
  thinking: string;
  gitDirty: string;
  gitBranch: string;
}

/**
 * ``frame`` — the borderless band look. Padding values are plain
 * numbers (>= 0): paddingTop/paddingBottom are blank lines shown *inside*
 * the band above/below the content.
 */
export interface FrameSettings {
  enable?: boolean;

  /** Below this terminal width the frame is skipped entirely (passthrough) */
  minWidth?: number;

  /** Blank rows inside the band above the content. Default 1 */
  paddingTop?: number;

  /** Blank rows inside the band below the content. Default 1 */
  paddingBottom?: number;

  /** Horizontal inner padding for the content rows. Default 2 */
  paddingX?: number;

  /** Horizontal outer margin for the content rows. Default 1 */
  marginX?: number;

  /** Blank rows OUTSIDE the band, above it. Default 0 */
  marginTop?: number;

  /** Blank rows OUTSIDE the band, below the pseudo-footer. Default 0 */
  marginBottom?: number;

  showCwd?: boolean;
  showModel?: boolean;
  showContext?: boolean;
  showThinking?: boolean;
  showAgentMode?: boolean;

  /** Show the status-animation spinner segment while streaming. Default false */
  showSpinner?: boolean;

  icons?: Partial<FrameIcons>;

  /** Text before the editor content. Default "┃" */
  prefix?: string;

  /** ThemeColor for the prefix; "agentMode" follows the agent's color if (@leo-alvarenga/pi-agent-manager is installed, defaults to "text otherwise"). Default: "agentMode" */
  prefixColor?: "agentMode" | ThemeColor;
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

  /** Accent color for segment highlights; Defaults to 'accent' */
  accentColor?: ThemeColor;
}
