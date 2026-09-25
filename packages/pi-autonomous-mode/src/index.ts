import * as fs from "node:fs";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { getAgentDir } from "@earendil-works/pi-coding-agent";
import { openGoalDb, openIndexDb } from "./db/open";
import { releaseGoalLock } from "./db/queries";
import { WIDGET_KEY } from "./constants";
import { registerAutonomousWidget, refreshAutonomousWidget } from "./widget";
import { createAutonomousStore } from "./store";
import { registerAutonomousCommand } from "./commands/index";
import { registerAutonomousUpdateTool } from "./tool/index";
import { buildResearcherPrompt } from "./supervisor/researcher-prompt";
import { buildSupervisorPrompt } from "./supervisor/supervisor-prompt";
import { renderProgress } from "./supervisor/progress";
import { runSupervisorStep } from "./supervisor/loop";

export default function (pi: ExtensionAPI): void {
  if (process.env.PI_SUBAGENT) return;
  if (process.env.PI_AUTONOMOUS_EXECUTOR) return;

  const store = createAutonomousStore(pi, (_next, ctx) =>
    refreshAutonomousWidget(ctx),
  );
  registerAutonomousWidget(store);

  registerAutonomousCommand(pi, store);
  registerAutonomousUpdateTool(pi, store);

  pi.on("session_start", (_e, ctx) => store.replay(ctx));
  pi.on("session_tree", (_e, ctx) => store.replay(ctx));
  pi.on("session_before_compact", (_e, ctx) => store.persistSnapshot(ctx));

  pi.on("session_shutdown", (_e, ctx) => {
    if (ctx.hasUI) ctx.ui.setWidget(WIDGET_KEY, undefined);

    const s = store.getState(ctx);
    if (s.activeGoalId) {
      const agentDir = getAgentDir();
      const indexDb = openIndexDb(agentDir);
      releaseGoalLock(indexDb, s.activeGoalId, ctx.sessionManager.getSessionId());
      indexDb.close();
    }
  });

  pi.on("before_agent_start", (event, ctx) => {
    const s = store.getState(ctx);
    if (s.phase === "idle" || s.phase === "done" || s.phase === "failed") return undefined;

    if (s.phase === "researching") {
      const goalText = s.goalFilePath
        ? fs.readFileSync(s.goalFilePath, "utf8")
        : "(goal file not found)";
      return {
        systemPrompt:
          event.systemPrompt + "\n\n" + buildResearcherPrompt(goalText),
      };
    }

    if (s.dbPath) {
      const agentDir = getAgentDir();
      const goalDb = openGoalDb(agentDir, s.activeGoalId!);
      const progress = renderProgress(goalDb);
      goalDb.close();
      return {
        systemPrompt:
          event.systemPrompt +
          "\n\n" +
          buildSupervisorPrompt(s.activeGoalTitle!, progress),
      };
    }

    return undefined;
  });

  pi.on("agent_end", (_event, ctx) => {
    const s = store.getState(ctx);
    if (s.phase !== "executing" && s.phase !== "planning") return;

    runSupervisorStep(pi, ctx, store).catch((err) => {
      ctx.ui.notify(`Supervisor loop error: ${String(err)}`, "error");
    });
  });
}
