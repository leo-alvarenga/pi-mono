import { getAgentDir } from "@earendil-works/pi-coding-agent";
import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import type { SessionRecordStore } from "@leo-alvarenga/pi-ext-core";

import type { AutonomousState } from "../types";
import { openGoalDb, openIndexDb } from "../db/open";
import {
  getGoal,
  getNextMilestone,
  updateMilestone,
  updateEpic,
  updateGoalStatus,
  updateGoalIndexStatus,
  insertExecutionLog,
  updateExecutionLog,
  dbHasBlockingMilestones,
} from "../db/queries";
import { spawnExecutor } from "./executor";
import { collectResult } from "./result";
import { renderProgress } from "./progress";
import { buildSupervisorPrompt } from "./supervisor-prompt";
import { refreshAutonomousWidget } from "../widget";

// ponytail: process-level guard; per-goal async locks if multi-goal concurrency matters
const runningGoals = new Set<string>();

export async function runSupervisorStep(
  pi: ExtensionAPI,
  ctx: ExtensionContext,
  store: SessionRecordStore<AutonomousState>,
): Promise<void> {
  const state = store.getState(ctx);
  if (!state.activeGoalId || state.phase === "idle" || state.phase === "done") return;

  if (runningGoals.has(state.activeGoalId)) return;
  runningGoals.add(state.activeGoalId);
  const agentDir = getAgentDir();
  const goalDb = openGoalDb(agentDir, state.activeGoalId);

  try {
    const goal = getGoal(goalDb, state.activeGoalId);
    if (!goal) {
      ctx.ui.notify("Goal record not found in DB.", "error");
      return;
    }

    const next = getNextMilestone(goalDb);

    if (!next) {
      // Distinguish "all done" from "blocked on input"
      const blocked = dbHasBlockingMilestones(goalDb);
      if (blocked) {
        ctx.ui.notify(
          `Goal "${goal.title}" is waiting on milestone input. Use /autonomous answer to continue.`,
          "info",
        );
        return;
      }

      updateGoalStatus(goalDb, state.activeGoalId, "completed");

      const indexDb = openIndexDb(agentDir);
      updateGoalIndexStatus(indexDb, state.activeGoalId, "completed");
      indexDb.close();

      store.commit(ctx, { ...state, phase: "done" });

      const progress = renderProgress(goalDb);
      ctx.ui.notify(`Goal "${goal.title}" completed!\n\n${progress}`, "info");
      return;
    }

    // Mark in-progress
    updateMilestone(goalDb, next.id, { status: "in_progress" });
    if (next.epic_status === "pending") {
      updateEpic(goalDb, next.epic_id, { status: "in_progress" });
    }
    refreshAutonomousWidget(ctx);

    ctx.ui.notify(
      `Executing: ${next.epic_title} → ${next.title}${next.retry_count > 0 ? ` (retry ${next.retry_count})` : ""}`,
      "info",
    );

    const logId = crypto.randomUUID();
    insertExecutionLog(goalDb, {
      id: logId,
      milestone_id: next.id,
      attempt: next.retry_count + 1,
      started_at: Date.now(),
      completed_at: 0,
      status: "running",
      output_summary: "",
      error: "",
      tokens_used: 0,
    });

    const execResult = await spawnExecutor(next, goal, ctx, {
      previousFailure: next.retry_count > 0 ? next.failure_reason : undefined,
    });

    updateExecutionLog(goalDb, logId, {
      completed_at: Date.now(),
      status: execResult.raw.exitCode === 0 ? "completed" : "failed",
      output_summary: execResult.raw.output.slice(0, 2000),
      error: execResult.raw.errorMessage ?? "",
      tokens_used: execResult.raw.usage?.contextTokens ?? 0,
    });

    const collected = collectResult(goalDb, execResult, next.retry_count, next.epic_id);
    refreshAutonomousWidget(ctx);

    if (collected.goalComplete) {
      updateGoalStatus(goalDb, state.activeGoalId, "completed");

      const indexDb = openIndexDb(agentDir);
      updateGoalIndexStatus(indexDb, state.activeGoalId, "completed");
      indexDb.close();

      store.commit(ctx, { ...state, phase: "done" });

      const progress = renderProgress(goalDb);
      ctx.ui.notify(`Goal "${goal.title}" completed!\n\n${progress}`, "info");
      return;
    }

    if (collected.status === "needs_input") {
      ctx.ui.notify(
        `Milestone "${next.title}" needs input:\n${(collected.questions ?? []).map((q) => `- ${q}`).join("\n")}\n\nUse /autonomous answer to provide answers.`,
        "info",
      );
      return;
    }

    if (collected.status === "failed" && !collected.retriable) {
      store.commit(ctx, { ...state, phase: "failed" });

      const indexDb = openIndexDb(agentDir);
      updateGoalStatus(goalDb, state.activeGoalId, "failed");
      updateGoalIndexStatus(indexDb, state.activeGoalId, "failed");
      indexDb.close();

      ctx.ui.notify(
        `Milestone "${next.title}" failed after max retries: ${collected.error ?? "unknown"}`,
        "error",
      );
      return;
    }

    if (collected.epicComplete) {
      ctx.ui.notify(`Epic "${next.epic_title}" completed!`, "info");
    }

    // Continue loop — inject next supervisor turn
    const progress = renderProgress(goalDb);
    pi.sendUserMessage(
      buildSupervisorPrompt(goal.title, progress),
      { deliverAs: "followUp" },
    );
  } finally {
    goalDb.close();
    runningGoals.delete(state.activeGoalId);
  }
}
