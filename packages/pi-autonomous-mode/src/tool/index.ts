import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import type { SessionRecordStore } from "@leo-alvarenga/pi-ext-core";

import type { AutonomousState } from "../types";
import { TOOL_NAME } from "../constants";
import { UpdateParams } from "./params";
import { handlePlanGoal } from "./handlers/plan-goal";
import { handleGoalDone } from "./handlers/goal-done";
import {
  handleEpicCreate,
  handleEpicUpdate,
  handleEpicDelete,
} from "./handlers/epic-crud";
import {
  handleMilestoneCreate,
  handleMilestoneUpdate,
  handleMilestoneDelete,
} from "./handlers/milestone-crud";

export function registerAutonomousUpdateTool(
  pi: ExtensionAPI,
  store: SessionRecordStore<AutonomousState>,
): void {
  pi.registerTool({
    name: TOOL_NAME,
    label: "Autonomous Update",
    parameters: UpdateParams,

    description:
      "Update the autonomous goal state: plan, track epics/milestones, mark done.",

    async execute(_toolCall, args: any, _signal, _onUpdate, ctx): Promise<any> {
      const hCtx = { ctx, store };

      switch (args.action) {
        case "plan_goal":
          return handlePlanGoal(args, ctx, store);

        case "goal_done":
          return handleGoalDone(ctx, store);

        case "epic_create":
          return handleEpicCreate(args, hCtx);

        case "epic_update":
          return handleEpicUpdate(args, hCtx);

        case "epic_delete":
          return handleEpicDelete(args, hCtx);

        case "milestone_create":
          return handleMilestoneCreate(args, hCtx);

        case "milestone_update":
          return handleMilestoneUpdate(args, hCtx);

        case "milestone_delete":
          return handleMilestoneDelete(args, hCtx);

        default:
          return {
            details: null,
            content: [
              { type: "text", text: `Unknown action: ${(args as any).action}` },
            ],
          };
      }
    },
  });
}
