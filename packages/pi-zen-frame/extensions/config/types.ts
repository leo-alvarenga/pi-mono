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
  tokenIn: string;
  tokenOut: string;
  thinking: string;
  gitDirty: string;
  gitBranch: string;
  bell: string;
  bellOff: string;
}

/**
 * ``frame`` — the editor frame preset. Styling and layout (prefix, colors,
 * margins, paddings) are owned by the renderer; only these behavioral
 * toggles are configurable.
 */
export interface FrameSettings {
  enable?: boolean;

  /** Below this terminal width the frame is skipped entirely (passthrough) */
  minWidth?: number;

  showCwd?: boolean;
  showModel?: boolean;
  showContext?: boolean;
  showThinking?: boolean;
  showAgentMode?: boolean;

  /** Show the status-animation spinner segment while streaming. Default false */
  showSpinner?: boolean;
}

/** `header` — the top-line header, which can show a logo or other text */
export interface HeaderSettings {
  enable: boolean;

  /** Header renderer by registered name. Default "basic". */
  type?: string;
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

  /** Editor-frame renderer by registered name. Default "blocky". */
  editorFrame?: string;

  /** Master mute: every segment except agent-mode renders muted.
   *  Default true. Toggle at runtime with `/zen_mode` or the `piZenFrame.zenMode`
   *  keybinding (default `ctrl+shift+z`). */
  zenMode?: boolean;

  /** Accent color for segment highlights; Defaults to 'accent' */
  accentColor?: ThemeColor;
}
