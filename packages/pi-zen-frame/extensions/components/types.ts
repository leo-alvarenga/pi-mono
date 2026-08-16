/**
 * THE COMPONENT CONTRACT.
 *
 * A "component" here is a small, isolated piece of the editor frame: Model,
 * Reasoning, spinner, token count, cwd, agent mode, ... Each lives
 * in its own file, exports a `SegmentDef`, and is registered in registry.ts.
 *
 * Adding a new component = 1 new file + 1 line in the registry. The frame
 * does all width math, joining and truncation — a segment never sees widths.
 */
import type { Theme, ThemeColor } from "@earendil-works/pi-coding-agent";

import type {
  FrameColors,
  FrameIcons,
  FrameSettings,
  SpinnerPhase,
} from "../config/types";

/** Where in the frame border a segment renders. */
export type Slot = "topLeft" | "topRight" | "bottomLeft" | "bottomRight";

export type AgentConfig = {
  name: string;
  icon?: string;
  color?: ThemeColor;
};

export type AgentState = {
  currentAgent: string;
  currentAgentLabel: string;
  currentAgentConfig: AgentConfig;
};

/** Agent-mode state surfaced by pi-agent-manager. */
export type AgentMode = {
  name: string;
  icon?: string;
  color?: ThemeColor;
} | null;

/** Live snapshot of everything a segment may want. Rebuilt on every paint. */
export interface FrameData {
  cwd: string;
  gitDirty: number;
  spinnerFrame: string;
  accentColor: ThemeColor;
  gitBranch: string | undefined;
  modelName: string | undefined;
  spinnerPhase: SpinnerPhase | null;
  thinkingLevel: string | undefined;

  /** Master mute: when true, every segment except agentMode renders muted. */
  zenMode: boolean;

  /** To render the agent mode (from @leo-alvarenga/pi-agent-manager) segment, if any */
  agentMode: AgentMode;

  context: {
    window: number;
    tokens: number | null;
    percent: number | null;
  } | null;
}

/** Data + rendering helpers handed to every segment. */
export interface SegmentContext {
  theme: Theme;
  icons: FrameIcons;
  cfg: FrameSettings;
  border: (str: string) => string;

  /** Resolve a segment's fg: zen-mode mutes everything except agentMode;
   *  else `frame.colors.<key>` supersedes the segment default. */
  segColor: (key: keyof FrameColors, fallback: ThemeColor) => ThemeColor;
}

/** A segment renders an already-ANSI-styled string, or "" to render nothing. */
export type Segment = (d: FrameData, ctx: SegmentContext) => string;

export interface SegmentDef {
  id: string;
  slot: Slot;
  render: Segment;
  enabled?: (d: FrameData, cfg: FrameSettings) => boolean;

  /** When enabled, this segment replaces everything else in the slot. */
  replaces?: (d: FrameData, cfg: FrameSettings) => boolean;
}

/**
 * Non-editor state the provider assembles on every render. The editor merges
 * this with its own live state (mode / count / spinner frame) in render().
 */
export interface ExternalData {
  modelName: string | undefined;
  thinkingLevel: string | undefined;
  spinnerPhase: SpinnerPhase | null;
  context: FrameData["context"];
  cwd: string;
  gitBranch: string | undefined;
  gitDirty: number;
  agentMode: AgentMode;
  theme: Theme | undefined;
  zenMode: boolean;
}
