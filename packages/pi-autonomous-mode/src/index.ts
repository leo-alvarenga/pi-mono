import * as fs from "node:fs";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { getAgentDir } from "@earendil-works/pi-coding-agent";
import { openGoalDb } from "./db/open";
import { createAutonomousStore } from "./store";
import { registerAutonomousCommand } from "./commands/index";
import { registerAutonomousUpdateTool } from "./tool/index";
import { buildResearcherPrompt } from "./supervisor/researcher-prompt";
import { buildSupervisorPrompt } from "./supervisor/supervisor-prompt";
import { renderProgress } from "./supervisor/progress";

export default function (pi: ExtensionAPI): void {
  if (process.env.PI_SUBAGENT) return;

  const store = createAutonomousStore(pi);

  registerAutonomousCommand(pi, store);
  registerAutonomousUpdateTool(pi, store);

  pi.on("session_start", (_e, ctx) => store.replay(ctx));
  pi.on("session_tree", (_e, ctx) => store.replay(ctx));
  pi.on("session_before_compact", (_e, ctx) => store.persistSnapshot(ctx));

  pi.on("before_agent_start", (event, ctx) => {
    const s = store.getState(ctx);
    if (s.phase === "idle" || s.phase === "done") return undefined;

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
}
