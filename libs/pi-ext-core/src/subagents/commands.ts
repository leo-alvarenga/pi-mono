import type { ThinkingLevel } from "@earendil-works/pi-agent-core";
import type {
  ExtensionAPI,
  ExtensionCommandContext,
} from "@earendil-works/pi-coding-agent";

import {
  openSelectSearch,
  SessionRecordStore,
  SubagentSpec,
  SubagentState,
} from "..";

function getAllModels(ctx: ExtensionCommandContext) {
  const scopedModels = ctx.scopedModels ?? [];
  const allModels = ctx.modelRegistry.getAvailable();

  if (scopedModels.length > 0) {
    return allModels.filter((m) =>
      scopedModels.find((scoped) => scoped.model.id === m.id),
    );
  }

  return allModels;
}

export function registerSubagentCommands(
  pi: ExtensionAPI,
  store: SessionRecordStore<SubagentState>,
  spec: SubagentSpec,
  isOrchestrator?: boolean,
): void {
  const supportedCmdArgs = [
    "list",
    ...(isOrchestrator ? ["set-operator-model"] : []),
  ];

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

      if (args.trim() === "set-operator-model") {
        if (!isOrchestrator) {
          ctx.ui.notify(
            `Supported arguments: ${supportedCmdArgs.join(", ")}`,
            "error",
          );

          return;
        }

        const models = getAllModels(ctx);

        const { operatorModel, operatorThinking } = store.getState(ctx);
        let modelSelectTitle = "Select operator model";

        if (operatorModel) {
          const modelName =
            models.find((m) => m.id === operatorModel)?.name ?? operatorModel;

          modelSelectTitle += ` (Current: ${modelName}${operatorThinking ? ` (thinking: ${operatorThinking})` : ""})`;
        }

        const modelId = await openSelectSearch(
          ctx.ui,
          modelSelectTitle,
          models.map((m) => ({
            value: m.id,
            label: m.name,
            description:
              [
                `(${m.id})`,
                m.provider,
                Object.keys(m.thinkingLevelMap ?? {}).join(", ") || undefined,
              ]
                .filter(Boolean)
                .join(" · ") || undefined,
          })),
        );

        if (!modelId) return;

        const model = models.find((m) => m.id === modelId);
        const levels = Object.keys(
          model?.thinkingLevelMap ?? {},
        ) as ThinkingLevel[];

        let thinking: ThinkingLevel | undefined;
        if (levels.length === 1) {
          thinking = levels[0];
        } else if (levels.length > 1) {
          const picked = await openSelectSearch(
            ctx.ui,
            "Select thinking level",
            levels.map((l) => ({
              value: l,
              label: l,
              description: model?.thinkingLevelMap?.[l] ?? undefined,
            })),
          );
          if (!picked) return;
          thinking = picked as ThinkingLevel;
        }

        const state = store.getState(ctx);
        store.commit(ctx, {
          ...state,
          operatorModel: modelId,
          operatorThinking: thinking,
        });

        ctx.ui.notify(
          `Operator: ${modelId}${thinking ? ` (thinking: ${thinking})` : ""}`,
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
}
