import type { Theme } from "@earendil-works/pi-coding-agent";
import type { ThinkingLevel } from "@earendil-works/pi-agent-core";
import type { KeyId } from "@earendil-works/pi-tui";
import type { BubblewrapOptions } from "../types";

export type SubagentStatus = "running" | "completed" | "failed" | "needs_input";

export type SubagentRecord = {
  id: number;
  task: string;
  cwd?: string;
  error?: string;
  output?: string;
  tokens?: number;
  startedAt: number;
  allowWrite: boolean;
  finishedAt?: number;
  questions?: string[];
  status: SubagentStatus;
  parentSessionId: string;
};

export type SubagentState = {
  nextId: number;
  records: SubagentRecord[];
  operatorModel?: string;
  operatorThinking?: ThinkingLevel;
};

export type SubagentDetails = {
  records: SubagentRecord[];
  mode: "single" | "parallel";
};

export type SubagentSpec = {
  tool: {
    name: string;
    label: string;
    description: string;
  };

  spawn: {
    flagEnv: string;
    bwrap?: BubblewrapOptions;
  };

  prompt: {
    snippet: string;
    guidelines: string[];
    instructions: {
      always: string;
      readOnly: string;
      writeAllowed: string;
    };
    needsInput: {
      marker: string;
      /** Full suffix block appended to system prompt (includes the marker template). */
      suffix: string;
    };
  };

  orchestratorMode?: {
    enabled?: boolean;
  };

  /** Tool allowlist; If left empty, readOnly enforcement is done via prompt guard-rails only **/
  allowlists?: {
    readOnly: string[];
    writeable: string[];
  };

  limits: {
    maxPanelRows: number;
    maxConcurrency: number;
    maxStoredOutput: number;
    maxParallelTasks: number;
    perTaskOutputCap: number;
    maxWritesPerSubagent: number;
  };

  entries: {
    state: string;
    report: string;
  };

  panel: {
    widgetKey: string;
    toggleChord: KeyId;
    title: string;
    emptyText: string;
  };

  /** Render a single record row for the TUI panel and /command report. */
  rowLine(record: SubagentRecord, theme: Theme): string;

  /** Group records into labelled sections for the /command report. */
  reportSections(
    s: SubagentState,
  ): Array<{ label: string; records: SubagentRecord[] }>;
};
