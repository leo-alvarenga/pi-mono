import type {
  AgentToolResult,
  ExtensionAPI,
} from "@earendil-works/pi-coding-agent";
import { Text } from "@earendil-works/pi-tui";

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
import { registerSubagentCommands } from "./commands";
import { hookEvents } from "./events";

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

  registerSubagentCommands(pi, store, spec, isOrchestrator);

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

  hookEvents(pi, store, spec);
}
