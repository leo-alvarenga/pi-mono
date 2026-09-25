import { getAgentDir } from "@earendil-works/pi-coding-agent";
import type { ExtensionCommandContext } from "@earendil-works/pi-coding-agent";
import type { SessionRecordStore } from "@leo-alvarenga/pi-ext-core";

import type { AutonomousState } from "../types";
import { openIndexDb, openGoalDb } from "../db/open";
import { getGoalIndex, getGoal } from "../db/queries";
import { renderProgress } from "../supervisor/progress";

export async function handleResume(
  args: string,
  ctx: ExtensionCommandContext,
  store: SessionRecordStore<AutonomousState>,
): Promise<void> {
  const goalId = args.trim();

  if (!goalId) {
    ctx.ui.notify("Usage: /autonomous resume <goal-id>", "error");
    return;
  }

  const agentDir = getAgentDir();
  const indexDb = openIndexDb(agentDir);
  const indexRow = getGoalIndex(indexDb, goalId);
  indexDb.close();

  if (!indexRow) {
    ctx.ui.notify(`Goal not found: ${goalId}`, "error");
    return;
  }

  const goalDb = openGoalDb(agentDir, goalId);

  const goal = getGoal(goalDb, goalId);
  const progress = renderProgress(goalDb);

  goalDb.close();

  store.commit(ctx, {
    phase: "executing",
    activeGoalId: goalId,
    dbPath: indexRow.db_path,
    goalFilePath: goal?.goal_file ?? null,
    activeGoalTitle: goal?.title ?? indexRow.title,
  });

  ctx.ui.notify(`Resumed goal: "${indexRow.title}"\n\n${progress}`, "info");
}
