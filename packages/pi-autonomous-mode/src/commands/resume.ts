import { getAgentDir } from "@earendil-works/pi-coding-agent";
import type { ExtensionAPI, ExtensionCommandContext } from "@earendil-works/pi-coding-agent";
import type { SessionRecordStore } from "@leo-alvarenga/pi-ext-core";

import type { AutonomousState } from "../types";
import { openIndexDb, openGoalDb } from "../db/open";
import { getGoalIndex, getGoal, getOrphanedMilestones, updateMilestone, acquireGoalLock } from "../db/queries";
import { renderProgress } from "../supervisor/progress";
import { buildSupervisorPrompt } from "../supervisor/supervisor-prompt";

export async function handleResume(
  args: string,
  ctx: ExtensionCommandContext,
  store: SessionRecordStore<AutonomousState>,
  pi: ExtensionAPI,
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

  // Acquire session lock (single executor per goal)
  const sessionId = ctx.sessionManager.getSessionId();
  const lockDb = openIndexDb(agentDir);
  const locked = acquireGoalLock(lockDb, goalId, sessionId);
  lockDb.close();

  if (!locked) {
    ctx.ui.notify(`Goal ${goalId} is already being executed by another session.`, "error");
    return;
  }

  const goalDb = openGoalDb(agentDir, goalId);

  try {
    // Crash recovery: reset orphaned in_progress milestones
    const orphaned = getOrphanedMilestones(goalDb);
    for (const m of orphaned) {
      updateMilestone(goalDb, m.id, { status: "pending" });
      ctx.ui.notify(`Reset orphaned milestone: "${m.title}" → pending`, "info");
    }

    const goal = getGoal(goalDb, goalId);
    const progress = renderProgress(goalDb);

    store.commit(ctx, {
      phase: "executing",
      activeGoalId: goalId,
      dbPath: indexRow.db_path,
      goalFilePath: goal?.goal_file ?? null,
      activeGoalTitle: goal?.title ?? indexRow.title,
    });

    ctx.ui.notify(`Resumed goal: "${indexRow.title}"\n\n${progress}`, "info");

    pi.sendUserMessage(
      buildSupervisorPrompt(goal?.title ?? indexRow.title, progress),
      { deliverAs: "followUp" },
    );
  } finally {
    goalDb.close();
  }
}
