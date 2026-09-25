import { Type } from "typebox";

export const UpdateParams = Type.Object({
  action: Type.Union([
    Type.Literal("plan_goal"),
    Type.Literal("goal_done"),
    Type.Literal("epic_create"),
    Type.Literal("epic_update"),
    Type.Literal("epic_delete"),
    Type.Literal("milestone_create"),
    Type.Literal("milestone_update"),
    Type.Literal("milestone_delete"),
  ]),

  goal: Type.Optional(
    Type.Object({
      title: Type.String(),
      description: Type.String(),
    }),
  ),

  epics: Type.Optional(
    Type.Array(
      Type.Object({
        title: Type.String(),
        acceptance_criteria: Type.Array(Type.String()),
      }),
    ),
  ),

  milestones: Type.Optional(
    Type.Array(
      Type.Object({
        epic_title: Type.String(),
        title: Type.String(),
        tasks: Type.Array(Type.String()),
        impl_notes: Type.String(),
      }),
    ),
  ),

  id: Type.Optional(Type.String()),
  executor_id: Type.Optional(Type.String()),

  title: Type.Optional(Type.String()),
  status: Type.Optional(Type.String()),
  impl_notes: Type.Optional(Type.String()),

  epic_id: Type.Optional(Type.String()),
  acceptance_criteria: Type.Optional(Type.Array(Type.String())),

  failure_reason: Type.Optional(Type.String()),
  tasks: Type.Optional(Type.Array(Type.String())),
});

export type UpdateParamsType = typeof UpdateParams extends { static: infer T }
  ? T
  : never;
