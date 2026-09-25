import * as fs from "node:fs";
import type { ExtensionCommandContext } from "@earendil-works/pi-coding-agent";
import type { SessionRecordStore } from "@leo-alvarenga/pi-ext-core";

import type { AutonomousState } from "../types";

export async function handleStart(
  args: string,
  ctx: ExtensionCommandContext,
  store: SessionRecordStore<AutonomousState>,
): Promise<void> {
  const goalFilePath = args.trim();
  if (!goalFilePath) {
    ctx.ui.notify("Usage: /autonomous start <path-to-goal-file>", "error");
    return;
  }

  if (!fs.existsSync(goalFilePath)) {
    ctx.ui.notify(`Goal file not found: ${goalFilePath}`, "error");
    return;
  }

  store.commit(ctx, {
    dbPath: null,
    goalFilePath,
    activeGoalId: null,
    phase: "researching",
    activeGoalTitle: null,
  });

  ctx.ui.notify(
    "Autonomous mode: RESEARCHER phase started. The Supervisor will analyze the goal and ask clarifying questions before planning.",
    "info",
  );
}
