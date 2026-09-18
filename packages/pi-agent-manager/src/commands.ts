import type { KeyId } from "@earendil-works/pi-tui";
import type {
  ExtensionAPI,
  ExtensionCommandContext,
} from "@earendil-works/pi-coding-agent";

import { AGENT_SHORTCUT_IDS } from "./constants";
import {
  getHelpText,
  getValidAgentNames,
  isValidAgent,
  capitalize,
} from "./cli/help";
import { openAgentPicker } from "./cli/picker";
import { setAgent, notifySwitch } from "./setup";
import type { AgentManager } from "./agent/manager";
import type { Logger } from "./cli/logger";

export function registerCommands(
  pi: ExtensionAPI,
  ctx: {
    agents: any[];
    agentManager: AgentManager;
    logger: Logger;
    shortcuts: Map<string, string[]>;
  },
): void {
  const { agents, agentManager, logger, shortcuts } = ctx;

  pi.registerCommand("agent_guard", {
    description:
      "Toggle the permission-guard XML envelope (on | off | no args = toggle)",

    getArgumentCompletions: async () =>
      ["on", "off"].map((value) => ({ label: value, value })),

    handler: async (args: string | undefined) => {
      const arg = args?.trim().toLowerCase();
      const next =
        arg === "on"
          ? true
          : arg === "off"
            ? false
            : !agentManager.getGuardEnabled();

      agentManager.setGuardEnabled(next, pi);
      logger.log(`Permission guard ${next ? "enabled" : "disabled"}`, "info");
    },
  });

  pi.registerCommand("agents_help", {
    description: "Show agent list, permissions, keybindings, and usage",
    handler: async () => {
      logger.log(getHelpText(agents, logger, shortcuts), "info");
    },
  });

  pi.registerCommand("agents", {
    description: "Pick an agent (no args = picker, <name> = direct switch)",
    getArgumentCompletions: async (partial: string) => {
      return agents
        .filter((a) => a.name.startsWith(partial.toLowerCase()))
        .map((a) => ({
          label: `${a.icon ? a.icon + " " : ""}${capitalize(a.name)}`,
          value: a.name,
        }));
    },
    handler: async (
      args: string | undefined,
      cmdCtx: ExtensionCommandContext,
    ) => {
      try {
        if (!args) {
          const chosen = await openAgentPicker(
            cmdCtx as any,
            agents,
            agentManager.getCurrentAgent(),
          );
          if (chosen) setAgent(chosen, agentManager, pi, cmdCtx as any);
          return;
        }

        const requested = args.trim().toLowerCase();
        if (!isValidAgent(requested, agents)) {
          logger.log(
            `Valid agents: ${getValidAgentNames(agents).join(", ")}`,
            "info",
          );
          logger.log(`Unknown agent "${requested}".`, "error");
          return;
        }

        setAgent(requested, agentManager, pi, cmdCtx as any);
      } catch (e) {
        logger.log(`Failed to switch agent: ${e}`, "error");
      }
    },
  });

  // Register keybindings
  const registerKeys = (
    id: string,
    desc: string,
    handler: (ctx: any) => void | Promise<void>,
  ) => {
    for (const key of shortcuts.get(id) ?? []) {
      pi.registerShortcut(key as KeyId, { description: desc, handler });
    }
  };

  registerKeys(AGENT_SHORTCUT_IDS.next, "Next agent", (ctx) => {
    agentManager.setNextAgent(pi);
    notifySwitch(ctx, agentManager);
  });

  registerKeys(AGENT_SHORTCUT_IDS.previous, "Previous agent", (ctx) => {
    agentManager.setPreviousAgent(pi);
    notifySwitch(ctx, agentManager);
  });

  registerKeys(AGENT_SHORTCUT_IDS.picker, "Agent picker", async (ctx) => {
    const chosen = await openAgentPicker(
      ctx,
      agents,
      agentManager.getCurrentAgent(),
    );
    if (chosen) setAgent(chosen, agentManager, pi, ctx);
  });
}
