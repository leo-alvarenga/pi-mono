import { getAgentDir } from "@earendil-works/pi-coding-agent";
import type { ExtensionContext } from "@earendil-works/pi-coding-agent";
import type { SessionRecordStore } from "@leo-alvarenga/pi-ext-core";
import type { AutonomousState } from "../../types";
import { openIndexDb, openGoalDb } from "../../db/open";
import { updateGoalStatus, updateGoalIndexStatus } from "../../db/queries";

export async function handleGoalDone(
  args: { failure_reason?: string },
  ctx: ExtensionContext,
  store: SessionRecordStore<AutonomousState>,
): Promise<{ content: Array<{ type: string; text: string }> }> {
  const s = store.getState(ctx);

  if (!s.activeGoalId) {
    return { content: [{ type: "text", text: "No active goal" }] };
  }

  const failed = !!args.failure_reason;
  const dbStatus = failed ? "failed" : "completed";
  const agentDir = getAgentDir();
  const indexDb = openIndexDb(agentDir);
  const goalDb = openGoalDb(agentDir, s.activeGoalId);

  try {
    updateGoalStatus(goalDb, s.activeGoalId, dbStatus);
    updateGoalIndexStatus(indexDb, s.activeGoalId, dbStatus);
  } finally {
    goalDb.close();
    indexDb.close();
  }

  store.commit(ctx, {
    dbPath: null,
    phase: failed ? "failed" : "done",
    activeGoalId: null,
    goalFilePath: null,
    activeGoalTitle: null,
  });

  const message = failed
    ? `Goal "${s.activeGoalTitle}" failed: ${args.failure_reason}`
    : `Goal "${s.activeGoalTitle}" completed!`;
  return { content: [{ type: "text", text: message }] };
}
