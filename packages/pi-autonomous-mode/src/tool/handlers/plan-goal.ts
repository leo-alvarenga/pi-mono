import * as path from "node:path";
import { getAgentDir } from "@earendil-works/pi-coding-agent";
import type { ExtensionContext } from "@earendil-works/pi-coding-agent";
import type { SessionRecordStore } from "@leo-alvarenga/pi-ext-core";
import type { AutonomousState } from "../../types";
import { openIndexDb, openGoalDb } from "../../db/open";
import {
  insertGoal,
  insertGoalIndex,
  insertEpic,
  insertMilestone,
} from "../../db/queries";
import { writeEpicFile, writeMilestoneFile } from "../../files";

export type PlanGoalArgs = {
  goal: { title: string; description: string };
  epics: Array<{ title: string; acceptance_criteria: string[] }>;

  milestones: Array<{
    title: string;
    tasks: string[];
    epic_title: string;
    impl_notes: string;
  }>;
};

export async function handlePlanGoal(
  args: PlanGoalArgs,
  ctx: ExtensionContext,
  store: SessionRecordStore<AutonomousState>,
): Promise<{ content: Array<{ type: string; text: string }> }> {
  const now = Date.now();
  const cwd = process.cwd();
  const agentDir = getAgentDir();
  const goalId = crypto.randomUUID();

  const indexDb = openIndexDb(agentDir);
  const goalDb = openGoalDb(agentDir, goalId);
  const goalDbPath = path.join(agentDir, "autonomous", goalId, "goal.db");

  try {
    goalDb.transaction((db) => {
      insertGoal(db, {
        cwd,
        id: goalId,
        created_at: now,
        updated_at: now,
        status: "executing",
        title: args.goal.title,
        description: args.goal.description,
        goal_file: store.getState(ctx).goalFilePath ?? "",
      });

      args.epics.forEach((epic, epicIdx) => {
        const epicId = crypto.randomUUID();

        const epicFile = writeEpicFile(
          agentDir,
          goalId,
          epicIdx,
          epic.title,
          epic.acceptance_criteria,
        );

        insertEpic(db, {
          id: epicId,
          created_at: now,
          goal_id: goalId,
          updated_at: now,
          title: epic.title,
          status: "pending",
          file_path: epicFile,
          order_index: epicIdx,
        });

        const epicMilestones = args.milestones
          .filter((m) => m.epic_title === epic.title)
          .forEach((m, msIdx) => {
            const msFile = writeMilestoneFile(
              agentDir,
              goalId,
              epicIdx,
              msIdx,
              m.title,
              m.tasks,
              m.impl_notes,
            );

            insertMilestone(db, {
              retry_count: 0,
              title: m.title,
              created_at: now,
              updated_at: now,
              epic_id: epicId,
              executor_id: "",
              status: "pending",
              file_path: msFile,
              order_index: msIdx,
              failure_reason: "",
              id: crypto.randomUUID(),
            });
          });

        void epicMilestones;
      });

      return null;
    });

    insertGoalIndex(indexDb, {
      cwd,
      id: goalId,
      created_at: now,
      updated_at: now,
      db_path: goalDbPath,
      status: "executing",
      title: args.goal.title,
    });

    store.commit(ctx, {
      ...store.getState(ctx),
      dbPath: goalDbPath,
      phase: "executing",
      activeGoalId: goalId,
      activeGoalTitle: args.goal.title,
    });
  } finally {
    goalDb.close();
    indexDb.close();
  }

  return {
    content: [
      {
        type: "text",
        text: `Goal planned: "${args.goal.title}" (id: ${goalId}). ${args.epics.length} epics and ${args.milestones.length} milestones created.`,
      },
    ],
  };
}
