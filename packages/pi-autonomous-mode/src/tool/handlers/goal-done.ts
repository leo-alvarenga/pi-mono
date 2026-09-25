import { getAgentDir } from "@earendil-works/pi-coding-agent";
import type { ExtensionContext } from "@earendil-works/pi-coding-agent";
import type { SessionRecordStore } from "@leo-alvarenga/pi-ext-core";
import type { AutonomousState } from "../../types";
import { openIndexDb, openGoalDb } from "../../db/open";
import { updateGoalStatus, updateGoalIndexStatus } from "../../db/queries";

export async function handleGoalDone(
  ctx: ExtensionContext,
  store: SessionRecordStore<AutonomousState>,
): Promise<{ content: Array<{ type: string; text: string }> }> {
  const s = store.getState(ctx);

  if (!s.activeGoalId) {
    return { content: [{ type: "text", text: "No active goal" }] };
  }

  const agentDir = getAgentDir();
  const indexDb = openIndexDb(agentDir);
  const goalDb = openGoalDb(agentDir, s.activeGoalId);

  try {
    updateGoalStatus(goalDb, s.activeGoalId, "completed");
    updateGoalIndexStatus(indexDb, s.activeGoalId, "completed");
  } finally {
    goalDb.close();
    indexDb.close();
  }

  store.commit(ctx, {
    dbPath: null,
    phase: "done",
    activeGoalId: null,
    goalFilePath: null,
    activeGoalTitle: null,
  });
  return {
    content: [{ type: "text", text: `Goal "${s.activeGoalTitle}" completed!` }],
  };
}
