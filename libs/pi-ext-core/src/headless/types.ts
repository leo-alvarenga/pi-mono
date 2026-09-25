import type { ThinkingLevel } from "@earendil-works/pi-agent-core";
import type { BubblewrapOptions, TokenUsage } from "../types";

export type RunHeadlessAgentOptions = {
  cwd: string;
  taskText: string;
  signal?: AbortSignal;
  systemPrompt: string;

  /** Name of the env flag to set (e.g. "PI_SUBAGENT") to prevent re-entry */
  spawnFlagEnv: string;

  /** If set, the pi process will create a new session (meaning you may be able to resume it or connect to it afterwards); Default is false */
  withSession?: boolean;

  model?: string;
  tools: string[] | null;
  parentSessionId?: string;
  thinking?: ThinkingLevel;
  bwrap?: BubblewrapOptions;
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
