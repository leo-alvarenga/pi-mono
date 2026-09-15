export type SessionStatus = "IDLE" | "BUSY";

export type TokenReport = {
  total: number;
  input: number;
  output: number;
};

// ponytail: TodoReport stub — wire when todo hook is available
export type TodoReport = {
  done: number;
  created: number;
  inProgress: number;
};

export type TmuxInfo = {
  session: string;
  window: string;
  windowName: string;
  pane: string;
};

export type SessionEntry = {
  id: string;
  cwd: string;
  name?: string;
  createdAt: string;
  resumedAt?: string;
  lastUpdatedAt: string;
  currentModel: string;
  todos: TodoReport;
  tokens: TokenReport;
  status: SessionStatus;
  tmux?: TmuxInfo;
};

export type FinishedEntry = {
  finished: true;
  name?: string;
  createdAt: string;
  finishedAt: string;
};

export type ReportSchema = Record<string, SessionEntry | FinishedEntry>;
