import { Type } from "typebox";

export const GoalIndexSchema = Type.Object({
  id:         Type.String(),
  title:      Type.String(),
  status:     Type.String(),
  db_path:    Type.String(),
  cwd:        Type.String(),
  lock_holder: Type.String(),
  created_at: Type.Integer(),
  updated_at: Type.Integer(),
});

export const GoalSchema = Type.Object({
  id:          Type.String(),
  title:       Type.String(),
  description: Type.String(),
  status:      Type.String(),
  goal_file:   Type.String(),
  cwd:         Type.String(),
  created_at:  Type.Integer(),
  updated_at:  Type.Integer(),
});

export const EpicSchema = Type.Object({
  id:          Type.String(),
  goal_id:     Type.String(),
  title:       Type.String(),
  status:      Type.String(),
  file_path:   Type.String(),
  order_index: Type.Integer(),
  created_at:  Type.Integer(),
  updated_at:  Type.Integer(),
});

export const MilestoneSchema = Type.Object({
  id:             Type.String(),
  epic_id:        Type.String(),
  title:          Type.String(),
  status:         Type.String(),
  file_path:      Type.String(),
  order_index:    Type.Integer(),
  executor_id:    Type.String(),
  failure_reason: Type.String(),
  retry_count:    Type.Integer(),
  created_at:     Type.Integer(),
  updated_at:     Type.Integer(),
});

export const ExecutionLogSchema = Type.Object({
  id:             Type.String(),
  milestone_id:   Type.String(),
  attempt:        Type.Integer(),
  started_at:     Type.Integer(),
  completed_at:   Type.Integer(),
  status:         Type.String(),
  output_summary: Type.String(),
  error:          Type.String(),
  tokens_used:    Type.Integer(),
});
