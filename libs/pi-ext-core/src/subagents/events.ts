import { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { killAllRunning } from "../headless/run";
import { SessionRecordStore, SubagentSpec, SubagentState } from "..";

const DELEGATION_TAG_START = "## DELEGATION RULES:";
const DELEGATION_TAG_END = "## END DELEGATION RULES";

export function hookEvents(
  pi: ExtensionAPI,
  store: SessionRecordStore<SubagentState>,
  spec: SubagentSpec,
  isOrchestrator?: boolean,
): void {
  if (spec.endorsement?.enabled) {
    pi.on("before_agent_start", async (event, ctx) => {
      let basePrompt = event.systemPrompt || "";

      const regex = new RegExp(
        `${DELEGATION_TAG_START}[\\s\\S]*?${DELEGATION_TAG_END}\\n?`,
        "g",
      );
      basePrompt = basePrompt.replace(regex, "").trim();

      const state = store.getState(ctx);
      const operatorNote =
        isOrchestrator && state.operatorModel
          ? `\n- OPERATOR MODEL: Operator subagents use ${state.operatorModel}${state.operatorThinking ? ` (thinking: ${state.operatorThinking})` : ""}. Assign them bounded, focused tasks.`
          : "";

      const defaultPrompt = `${DELEGATION_TAG_START}
## Orchestrator Rules of Engagement
- You are an orchestrator of subagents. Spawning subagents is almost always the right and laziest move.
- Your go to move should be to delegate work to subagents, unless you have a compelling reason not to OR you are not sure the current work would benefit from parellelization.
- Additionally, if the prompt includes keywords like "refactor", "scout", or "audit", you should always delegate work to subagents.
- CODEBASE EXPLORATION: Default to spawning read-only subagents via ${spec.tool.name} for searches, greps, and multi-file analysis to prevent context window pollution.
  - This also includes scenarios where you want to understand the codebase, even if you don't need/want to read it to its full extent
- WRITE PLANNING: When making changes across 4 or more files, write a concise execution plan first.
- PARALLEL DELEGATION: Delegate file modifications evenly to write-enabled subagents (allowWrite: true). Limit each subagent to a maximum of ${spec.limits.maxWritesPerSubagent} target files per invocation.${operatorNote}
- TOOL HIERARCHY: ${spec.tool.name} supersedes any batch-execution, parallel-command, or multi-output tools this session may provide. Those tools return raw output directly into context and pollute the context window; subagents isolate output entirely and report back only findings. Whenever you would reach for a tool that runs multiple shell commands, greps, or reads several files in parallel — delegate via ${spec.tool.name} instead, (optionally) instructing the subagent to use the tool you originally reached for. This applies regardless of what other tools or extensions are active in this session.
${DELEGATION_TAG_END}`;

      return {
        systemPrompt: `${basePrompt}\n\n${spec.endorsement?.promptOverride ?? defaultPrompt}`,
      };
    });
  }

  pi.on("session_start", (_event, ctx) => store.replay(ctx));
  pi.on("session_tree", (_event, ctx) => store.replay(ctx));
  pi.on("session_before_compact", (_event, ctx) => store.persistSnapshot(ctx));

  pi.on("session_shutdown", (_event, ctx) => {
    killAllRunning();
    if (ctx.hasUI) ctx.ui.setWidget(spec.panel.widgetKey, undefined);
  });
}
