import type { ThinkingLevel } from "@earendil-works/pi-agent-core";
import type { BubblewrapOptions, TokenUsage } from "../types";

export type RunHeadlessAgentOptions = {
  cwd: string;
  taskText: string;
  signal?: AbortSignal;
  systemPrompt: string;

  /** Name of the env flag to set (e.g. "PI_SUBAGENT") to prevent re-entry */
  spawnFlagEnv: string;

  tools: string[] | null;
  parentSessionId?: string;
  bwrap?: BubblewrapOptions;
  model?: string;
  thinking?: ThinkingLevel;
};

export type HeadlessRunTokenUsage = Required<Omit<TokenUsage, "total">> & {
  turns: number;
  contextTokens: number;
};

export type HeadlessRunResult = {
  output: string;
  model?: string;
  stderr: string;
  exitCode: number;
  aborted: boolean;
  stopReason?: string;
  errorMessage?: string;

  usage: HeadlessRunTokenUsage;
};
