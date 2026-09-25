import { getAgentDir } from "@earendil-works/pi-coding-agent";
import type { ExtensionAPI, ExtensionCommandContext } from "@earendil-works/pi-coding-agent";
import type { SessionRecordStore } from "@leo-alvarenga/pi-ext-core";

import type { AutonomousState } from "../types";
import { openGoalDb } from "../db/open";
import { getMilestone, getGoal, updateMilestone, getEpic, insertExecutionLog, updateExecutionLog } from "../db/queries";
import { spawnExecutor } from "../supervisor/executor";
import { collectResult } from "../supervisor/result";
import { renderProgress } from "../supervisor/progress";
import { buildSupervisorPrompt } from "../supervisor/supervisor-prompt";
import { refreshAutonomousWidget } from "../widget";

export async function handleAnswer(
  args: string,
  ctx: ExtensionCommandContext,
  store: SessionRecordStore<AutonomousState>,
  pi: ExtensionAPI,
): Promise<void> {
  const state = store.getState(ctx);
  if (!state.activeGoalId) {
    ctx.ui.notify("No active goal.", "error");
    return;
  }

  const firstSpace = args.indexOf(" ");
  if (firstSpace === -1) {
    ctx.ui.notify("Usage: /autonomous answer <milestone-id> <answers>", "error");
    return;
  }

  const milestoneId = args.slice(0, firstSpace).trim();
  const answers = args.slice(firstSpace + 1).trim();

  if (!answers) {
    ctx.ui.notify("Please provide answers after the milestone ID.", "error");
    return;
  }

  const agentDir = getAgentDir();
  const goalDb = openGoalDb(agentDir, state.activeGoalId);

  try {
    const milestone = getMilestone(goalDb, milestoneId);
    if (!milestone) {
      ctx.ui.notify(`Milestone not found: ${milestoneId}`, "error");
      return;
    }

    if (milestone.status !== "needs_input") {
      ctx.ui.notify(`Milestone "${milestone.title}" is not waiting for input (status: ${milestone.status}).`, "error");
      return;
    }

    const goal = getGoal(goalDb, state.activeGoalId);
    if (!goal) {
      ctx.ui.notify("Goal record not found.", "error");
      return;
    }

    const epic = getEpic(goalDb, milestone.epic_id);

    updateMilestone(goalDb, milestoneId, { status: "in_progress" });
    ctx.ui.notify(`Re-executing milestone "${milestone.title}" with provided answers...`, "info");

    const logId = crypto.randomUUID();
    insertExecutionLog(goalDb, {
      id: logId,
      milestone_id: milestoneId,
      attempt: milestone.retry_count + 1,
      started_at: Date.now(),
      completed_at: 0,
      status: "running",
      output_summary: "",
      error: "",
      tokens_used: 0,
    });

    const execResult = await spawnExecutor(
      { ...milestone, epic_title: epic?.title ?? "" },
      goal,
      ctx,
      { answers },
    );

    updateExecutionLog(goalDb, logId, {
      completed_at: Date.now(),
      status: execResult.raw.exitCode === 0 ? "completed" : "failed",
      output_summary: execResult.raw.output.slice(0, 2000),
      error: execResult.raw.errorMessage ?? "",
      tokens_used: execResult.raw.usage?.contextTokens ?? 0,
    });

    const collected = collectResult(goalDb, execResult, milestone.retry_count, milestone.epic_id);
    refreshAutonomousWidget(ctx);

    if (collected.status === "completed") {
      ctx.ui.notify(`Milestone "${milestone.title}" completed!`, "info");
    } else if (collected.status === "needs_input") {
      ctx.ui.notify(
        `Milestone still needs input:\n${(collected.questions ?? []).map((q) => `- ${q}`).join("\n")}`,
        "info",
      );
      return;
    } else if (collected.status === "failed") {
      ctx.ui.notify(`Milestone "${milestone.title}" failed: ${collected.error}`, "error");
    }

    // Continue the loop
    const progress = renderProgress(goalDb);
    pi.sendUserMessage(
      buildSupervisorPrompt(goal.title, progress),
      { deliverAs: "followUp" },
    );
  } finally {
    goalDb.close();
  }
}
