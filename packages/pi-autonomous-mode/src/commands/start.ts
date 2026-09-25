import * as fs from "node:fs";
import type {
  ExtensionAPI,
  ExtensionCommandContext,
} from "@earendil-works/pi-coding-agent";
import type { SessionRecordStore } from "@leo-alvarenga/pi-ext-core";

import type { AutonomousState } from "../types";
import { buildResearcherPrompt } from "../supervisor/researcher-prompt";

export async function handleStart(
  args: string,
  ctx: ExtensionCommandContext,
  store: SessionRecordStore<AutonomousState>,
  pi: ExtensionAPI,
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

  // Validate goal file format: non-empty, has at least one non-whitespace line
  const content = fs.readFileSync(goalFilePath, "utf8");
  if (!content.trim()) {
    ctx.ui.notify("Goal file is empty. Write a title and description first.", "error");
    return;
  }

  const lines = content.split("\n").filter((l) => l.trim());
  if (lines.length === 0) {
    ctx.ui.notify("Goal file has no content. Write a title and description first.", "error");
    return;
  }

  store.commit(ctx, {
    dbPath: null,
    goalFilePath,
    activeGoalId: null,
    phase: "researching",
    activeGoalTitle: null,
  });

  try {
    pi.sendUserMessage(
      buildResearcherPrompt(content),
      {
        deliverAs: "followUp",
      },
    );

    ctx.ui.notify(
      "Autonomous mode: RESEARCHER phase started. The Supervisor will analyze the goal and ask clarifying questions before planning.",
      "info",
    );
  } catch (error) {
    ctx.ui.notify(
      `"Autonomous mode failed to start.\nError: ${JSON.stringify(error)}"`,
      "info",
    );
  }
}
