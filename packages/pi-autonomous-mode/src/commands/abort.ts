import { getAgentDir } from "@earendil-works/pi-coding-agent";
import type { ExtensionCommandContext } from "@earendil-works/pi-coding-agent";
import type { SessionRecordStore } from "@leo-alvarenga/pi-ext-core";
import type { AutonomousState } from "../types";
import { openIndexDb, openGoalDb } from "../db/open";
import { updateGoalStatus, updateGoalIndexStatus, releaseGoalLock } from "../db/queries";

export async function handleAbort(
  _args: string,
  ctx: ExtensionCommandContext,
  store: SessionRecordStore<AutonomousState>,
): Promise<void> {
  const s = store.getState(ctx);
  if (s.phase === "idle" || !s.activeGoalId) {
    ctx.ui.notify("No active goal to abort.", "info");
    return;
  }

  const agentDir = getAgentDir();
  const indexDb = openIndexDb(agentDir);
  const goalDb = openGoalDb(agentDir, s.activeGoalId);

  try {
    updateGoalStatus(goalDb, s.activeGoalId, "paused");
    updateGoalIndexStatus(indexDb, s.activeGoalId, "paused");
    releaseGoalLock(indexDb, s.activeGoalId, ctx.sessionManager.getSessionId());
  } finally {
    goalDb.close();
    indexDb.close();
  }

  store.commit(ctx, {
    dbPath: null,
    phase: "idle",
    activeGoalId: null,
    goalFilePath: null,
    activeGoalTitle: null,
  });
  ctx.ui.notify(
    `Goal "${s.activeGoalTitle}" paused. Resume with /autonomous resume ${s.activeGoalId}`,
    "info",
  );
}
