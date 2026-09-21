import type {
  AgentToolResult,
  ExtensionAPI,
} from "@earendil-works/pi-coding-agent";
import type { ThinkingLevel } from "@earendil-works/pi-agent-core";
import { Text } from "@earendil-works/pi-tui";

import { killAllRunning } from "../headless/run";
import { createSessionStore } from "../session/store";
import { createPanelWidget } from "../tui/panel";
import type { PanelWidgetControls } from "../tui/types";

import { handleParallel, handleSingle } from "./execute";
import { SubagentParams } from "./schema";
import { renderReport } from "./state";
import type {
  SubagentDetails,
  SubagentRecord,
  SubagentSpec,
  SubagentState,
} from "./types";

const DELEGATION_TAG_START = "## DELEGATION RULES:";
const DELEGATION_TAG_END = "## END DELEGATION RULES";

const VALID_THINKING_LEVELS: readonly string[] = [
  "off",
  "minimal",
  "low",
  "medium",
  "high",
  "xhigh",
  "max",
];

/** Register the subagent tool, command, panel, and session event handlers;
 *
 *  This is a subagent runtime factory; If you are building your own subagent solution based on this lib,
 *  you should build own wrapper using util exported by this lib
 * */
export function createSubagentRuntime(
  pi: ExtensionAPI,
  spec: SubagentSpec,
): void {
  let panel: PanelWidgetControls | undefined;

  const isOrchestrator = spec.orchestratorMode?.enabled;

  const supportedCmdArgs = [
    "list",
    ...(isOrchestrator ? ["set-operator-model"] : []),
  ];

  const store = createSessionStore<SubagentState>({
    entryType: spec.entries.state,

    empty: () => ({
      nextId: 1,
      records: [],
    }),

    onChange: (snapshot, ctx) => {
      if (snapshot.records.length > 0) {
        pi.appendEntry(spec.entries.state, snapshot);
      }

      panel?.refresh(ctx);
    },

    snapshotOf: (entry) => {
      const d = entry.data as SubagentState | undefined;

      return d
        ? {
            nextId: d.nextId,
            records: d.records.filter((r) => r.status !== "running"),
            operatorModel: d.operatorModel,
            operatorThinking: d.operatorThinking,
          }
        : undefined;
    },
  });

  panel = createPanelWidget<SubagentState>(pi, {
    store,
    emptyText: spec.panel.emptyText,
    widgetKey: spec.panel.widgetKey,
    moreLabel: (n) => `… +${n} more`,
    maxRows: spec.limits.maxPanelRows,
    toggleChord: spec.panel.toggleChord,

    isEmpty: (s) =>
      s.records.length === 0 ||
      s.records.every((sub) => sub.status === "completed"),

    header: (s, theme, isCollapsed) => {
      const running = s.records.filter((r) => r.status === "running").length;
      const done = s.records.length - running;
      const icon = isCollapsed ? "󰅂" : "󰅀";

      return theme.fg(
        "accent",
        `${icon}  ${spec.panel.title} | ${running} running / ${done} done`,
      );
    },

    rows: (s, theme) => {
      const running = s.records.filter((r) => r.status === "running");
      const finished = s.records.filter((r) => r.status !== "running");
      return [...running, ...finished].map((r) => spec.rowLine(r, theme));
    },
  });

  panel.register();

  pi.registerTool({
    name: spec.tool.name,
    label: spec.tool.label,
    parameters: SubagentParams,
    description: spec.tool.description,
    promptSnippet: spec.prompt.snippet,
    promptGuidelines: spec.prompt.guidelines,

    async execute(_toolCallId, params, signal, onUpdate, ctx) {
      const hasTasks = (params.tasks?.length ?? 0) > 0;
      const hasSingle = Boolean(params.task);
      const modeCount = Number(hasTasks) + Number(hasSingle);

      const errorResult = (text: string): AgentToolResult<SubagentDetails> => ({
        content: [{ type: "text", text }],
        details: { mode: hasTasks ? "parallel" : "single", records: [] },
      });

      if (modeCount !== 1) {
        return errorResult(
          "Provide exactly one of `task` (single) or `tasks` (parallel).",
        );
      }

      const { operatorModel, operatorThinking } = store.getState(ctx);
      const ec = { store, spec, ctx, signal, operatorModel, operatorThinking };

      if (hasSingle) {
        return handleSingle(ec, {
          cwd: params.cwd,
          task: params.task!,
          answers: params.answers,
          allowWrite: params.allowWrite,
        });
      }

      if (params.tasks!.length > spec.limits.maxParallelTasks) {
        return errorResult(
          `Too many parallel tasks (${params.tasks!.length}). Max is ${spec.limits.maxParallelTasks}.`,
        );
      }

      return handleParallel(ec, params.tasks!, onUpdate);
    },

    renderCall(args, theme) {
      if (args.tasks && args.tasks.length > 0) {
        let text =
          theme.fg("toolTitle", theme.bold(`${spec.tool.name} `)) +
          theme.fg("accent", `parallel (${args.tasks.length} tasks)`);

        for (const t of args.tasks.slice(0, 3)) {
          const preview =
            t.task.length > 40 ? `${t.task.slice(0, 40)}…` : t.task;
          text += `\n  ${theme.fg("dim", preview)}${t.allowWrite ? theme.fg("warning", " ✎") : ""}`;
        }

        if (args.tasks.length > 3) {
          text += `\n  ${theme.fg("muted", `… +${args.tasks.length - 3} more`)}`;
        }

        return new Text(text, 0, 0);
      }

      const preview = args.task
        ? args.task.length > 60
          ? `${args.task.slice(0, 60)}…`
          : args.task
        : "...";

      let text =
        theme.fg("toolTitle", theme.bold(`${spec.tool.name} `)) +
        theme.fg("dim", preview);

      if (args.allowWrite) text += theme.fg("warning", " ✎");

      return new Text(text, 0, 0);
    },

    renderResult(result, _options, theme) {
      const details = result.details as SubagentDetails | undefined;

      const text =
        result.content[0]?.type === "text" ? result.content[0].text : "";

      const statuses = details?.records.map((r) => r.status) ?? [];

      const color = statuses.includes("failed")
        ? "error"
        : statuses.includes("needs_input")
          ? "warning"
          : "muted";

      return new Text(theme.fg(color, text), 0, 0);
    },
  });

  pi.registerCommand(spec.tool.name, {
    description: isOrchestrator
      ? "Show all subagents grouped by status, or configure operator model"
      : "Show all subagents grouped by status",
    getArgumentCompletions: async () =>
      supportedCmdArgs.map((value) => ({ label: value, value })),
    handler: async (args, ctx) => {
      if (!ctx.hasUI) {
        ctx.ui.notify(`/${spec.tool.name} requires interactive mode`, "error");

        return;
      }

      if (args.startsWith("set-operator-model")) {
        if (!isOrchestrator) {
          ctx.ui.notify(
            `Supported arguments: ${supportedCmdArgs.join(", ")}`,
            "error",
          );
          return;
        }

        const parts = args.trim().split(/\s+/).slice(1);
        const [model, thinking] = parts;

        if (!model) {
          ctx.ui.notify(
            "Usage: set-operator-model <model> [thinking-level]",
            "error",
          );
          return;
        }

        if (thinking && !VALID_THINKING_LEVELS.includes(thinking)) {
          ctx.ui.notify(
            `Invalid thinking level "${thinking}". Valid: ${VALID_THINKING_LEVELS.join(", ")}`,
            "error",
          );
          return;
        }

        const state = store.getState(ctx);
        store.commit(ctx, {
          ...state,
          operatorModel: model,
          operatorThinking: thinking as ThinkingLevel | undefined,
        });

        ctx.ui.notify(
          `Operator model: ${model}${thinking ? ` · thinking: ${thinking}` : ""}`,
          "info",
        );
        return;
      }

      if (args !== "list" && args !== "") {
        ctx.ui.notify(
          `Supported arguments: ${supportedCmdArgs.join(", ")}`,
          "error",
        );

        return;
      }

      pi.appendEntry(spec.entries.report, {
        records: [...store.getState(ctx).records],
      });
    },
  });

  pi.registerEntryRenderer<{ records: SubagentRecord[] }>(
    spec.entries.report,
    (entry, _options, theme) =>
      new Text(
        renderReport(
          entry.data ?? { records: [] as SubagentRecord[] },
          theme,
          spec,
        ),
        0,
        0,
      ),
  );

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
