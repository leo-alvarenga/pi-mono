import { Type } from "typebox";

const TaskItem = Type.Object({
  task: Type.String({ description: "Task to delegate to a subagent" }),
  allowWrite: Type.Optional(
    Type.Boolean({
      description: "Allow the subagent to edit files. Default: false",
    }),
  ),
  answers: Type.Optional(
    Type.String({
      description: "Answers to a prior NEEDS_INPUT, for re-spawn of this task",
    }),
  ),
  cwd: Type.Optional(
    Type.String({ description: "Working directory for this subagent" }),
  ),
});

export const SubagentParams = Type.Object({
  task: Type.Optional(
    Type.String({ description: "Task to delegate (single mode)" }),
  ),

  tasks: Type.Optional(
    Type.Array(TaskItem, {
      description: "Tasks to delegate in parallel (max 8)",
    }),
  ),

  allowWrite: Type.Optional(
    Type.Boolean({
      description: "Allow write for single mode. Default: false.",
    }),
  ),

  answers: Type.Optional(
    Type.String({
      description: "Answers to a prior NEEDS_INPUT (single mode re-spawn)",
    }),
  ),

  cwd: Type.Optional(
    Type.String({ description: "Working directory (single mode)" }),
  ),
});
