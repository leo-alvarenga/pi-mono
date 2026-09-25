import { getAgentDir } from "@earendil-works/pi-coding-agent";
import type { ExtensionCommandContext } from "@earendil-works/pi-coding-agent";
import type { SessionRecordStore } from "@leo-alvarenga/pi-ext-core";
import type { AutonomousState } from "../types";
import { openGoalDb } from "../db/open";
import { renderProgress } from "../supervisor/progress";

export async function handleStatus(
  _args: string,
  ctx: ExtensionCommandContext,
  store: SessionRecordStore<AutonomousState>,
): Promise<void> {
  const s = store.getState(ctx);
  if (s.phase === "idle" || !s.activeGoalId || !s.dbPath) {
    ctx.ui.notify("No active goal. Use /autonomous start <file> to begin.", "info");
    return;
  }

  const agentDir = getAgentDir();
  const goalDb = openGoalDb(agentDir, s.activeGoalId);
  const progress = renderProgress(goalDb);
  goalDb.close();

  ctx.ui.notify(
    `Goal: "${s.activeGoalTitle}" [${s.phase}]\n\n${progress}`,
    "info",
  );
}
