export type SubagentStatus = "running" | "completed" | "failed" | "needs_input";

export interface SubagentRecord {
  id: number;
  task: string;
  cwd?: string;
  startedAt: number;
  allowWrite: boolean;
  finishedAt?: number;
  status: SubagentStatus;

  /** Final output summary (truncated for storage). */
  output?: string;
  tokens?: number;
  error?: string;
  questions?: string[];
}

export interface SubagentState {
  records: SubagentRecord[];
  nextId: number;
}

/** Shape stored in the tool result `details` for rendering. */
export interface SubagentDetails {
  mode: "single" | "parallel";
  records: SubagentRecord[];
}
