import type { Theme } from "@earendil-works/pi-coding-agent";
import type { KeyId } from "@earendil-works/pi-tui";

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
};

export type SubagentDetails = {
  records: SubagentRecord[];
  mode: "single" | "parallel";
};

export type SubagentSpec = {
  /** Env flag name set on child processes to prevent re-entry (e.g. "PI_SUBAGENT") */
  spawnFlagEnv: string;

  toolName: string;
  toolLabel: string;
  promptSnippet: string;
  toolDescription: string;
  promptGuidelines: string[];

  promptInstructions: {
    always: string;
    readOnly: string;
    writeAllowed: string;
  };

  needsInput: {
    marker: string;
    /** Full suffix block appended to system prompt (includes the marker template). */
    suffix: string;
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
  };

  state: { entryType: string };
  report: { entryType: string };

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
