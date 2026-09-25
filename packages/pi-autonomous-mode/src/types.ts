import { ExtensionContext } from "@earendil-works/pi-coding-agent";
import { SessionRecordStore } from "@leo-alvarenga/pi-ext-core";

export type GoalStatus =
  "researching" | "planning" | "executing" | "completed" | "failed" | "paused";

export type HandlerCtx = {
  ctx: ExtensionContext;
  store: SessionRecordStore<AutonomousState>;
};

export type AutonomousState = {
  dbPath: string | null;
  activeGoalId: string | null;
  goalFilePath: string | null;
  activeGoalTitle: string | null;
  phase: "idle" | "researching" | "planning" | "executing" | "done" | "failed";
};

export type GoalRow = {
  id: string;
  cwd: string;
  title: string;
  status: string;
  goal_file: string;
  created_at: number;
  updated_at: number;
  description: string;
};

export type GoalIndexRow = {
  id: string;
  cwd: string;
  title: string;
  status: string;
  db_path: string;
  lock_holder: string;
  created_at: number;
  updated_at: number;
};

export type EpicRow = {
  id: string;
  title: string;
  status: string;
  goal_id: string;
  file_path: string;
  created_at: number;
  updated_at: number;
  order_index: number;
};

export type MilestoneRow = {
  id: string;
  title: string;
  status: string;
  epic_id: string;
  file_path: string;
  created_at: number;
  updated_at: number;
  order_index: number;
  executor_id: string;
  retry_count: number;
  failure_reason: string;
};

export type ExecutionLogRow = {
  id: string;
  milestone_id: string;
  attempt: number;
  started_at: number;
  completed_at: number;
  status: string;
  output_summary: string;
  error: string;
  tokens_used: number;
};
