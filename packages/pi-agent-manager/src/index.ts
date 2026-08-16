import type {
  ExtensionAPI,
  ExtensionCommandContext,
  ExtensionContext,
} from "@earendil-works/pi-coding-agent";
import type { KeyId } from "@earendil-works/pi-tui";

import {
  AGENT_SHORTCUT_IDS,
  AGENT_DATA_KEY,
  AGENT_PROFILE_END_TAG,
  AGENT_PROFILE_START_TAG,
} from "./constants";
import { BUILT_IN_AGENTS, DEFAULT_AGENT } from "./agent/builtin";
import { createAgentManager } from "./agent/manager";
import { loadAgentShortcuts, loadUserAgents } from "./agent/config";
import { createLogger, Logger } from "./cli/logger";
import { openAgentPicker } from "./cli/picker";
import {
  getHelpText,
  getValidAgentNames,
  isValidAgent,
  capitalize,
} from "./cli/help";
import { TOOL_TO_PERMISSION, extractPattern } from "./permission/mapping";
import type { AgentState } from "./agent/types";

export default async function (pi: ExtensionAPI) {
  // ------------------------------------------------------------------
  // Bootstrap
  // ------------------------------------------------------------------

  const { agents: userAgents, errors: configErrors } = await loadUserAgents();
  const userNames = new Set(userAgents.map((a) => a.name));
  const agents = [
    ...BUILT_IN_AGENTS.filter((a) => !userNames.has(a.name)),
    ...userAgents,
  ];

  const agentManager = createAgentManager(agents);
  const shortcuts = loadAgentShortcuts();

  let logger: Logger;
  let previousAgent: string | undefined;

  // ------------------------------------------------------------------
  // Lifecycle: session start — restore last agent
  // ------------------------------------------------------------------

  pi.on("session_start", async (_, ctx) => {
    logger = createLogger(ctx);
    agentManager.initialize(pi);

    if (configErrors.length > 0) {
      logger.log(
        `${configErrors.length} problem(s) in agents directory; affected agents skipped`,
        "error",
      );
    }

    const entries = [...ctx.sessionManager.getBranch()].reverse();
    let agent: string | undefined;
    let guardEnabled: boolean | undefined;
    for (const entry of entries) {
      if (entry.type !== "custom" || entry.customType !== AGENT_DATA_KEY)
        continue;
      const state = entry.data as Partial<AgentState>;
      if (
        typeof state?.currentAgent === "string" &&
        isValidAgent(state.currentAgent, agents)
      ) {
        agent = state.currentAgent;
        guardEnabled = state.guardEnabled;
        break;
      }
    }

    setAgent(agent || DEFAULT_AGENT, ctx, true);
    if (guardEnabled) agentManager.setGuardEnabled(true, pi);
  });

  // ------------------------------------------------------------------
  // Lifecycle: before each turn — inject persona only (no policy block)
  // ------------------------------------------------------------------

  pi.on("before_agent_start", async (event) => {
    if (previousAgent === agentManager.getCurrentAgent()) {
      return { systemPrompt: event.systemPrompt };
    }

    previousAgent = agentManager.getCurrentAgent();
    let base = (event.systemPrompt || "").trim();

    // Strip any previously injected block (idempotent)
    base = base
      .replace(
        new RegExp(
          `${AGENT_PROFILE_START_TAG}[\\s\\S]*?${AGENT_PROFILE_END_TAG}\\n?`,
          "g",
        ),
        "",
      )
      .trim();

    const agent = agentManager.getCurrentAgentConfig();
    const persona = agentManager.getAgentPersona();

    if (!agent || !persona) return { systemPrompt: base };

    const permissionSummary = agent.permissions
      .filter((r) => r.pattern === "*")
      .map((r) => `${r.permission}=${r.action}`)
      .join(", ");

    const block = [
      AGENT_PROFILE_START_TAG,
      `## Active Agent: ${agent.name.toUpperCase()}`,
      persona.trim(),
      `[Permissions: ${permissionSummary}]`,
      AGENT_PROFILE_END_TAG,
    ].join("\n");

    // Steps exhausted? Inject a forced-summary prefix.
    if (agentManager.isStepsExhausted()) {
      const warning = [
        "---",
        `[AGENT LIMIT] You have reached your step budget (${agent.steps}).`,
        "Summarise what you've done and recommend remaining tasks.",
        "DO NOT call any more tools.",
        "---\n",
      ].join("\n");
      return { systemPrompt: `${base}\n\n${warning}${block}` };
    }

    return { systemPrompt: `${base}\n\n${block}` };
  });

  // ------------------------------------------------------------------
  // Permission guard — prepend XML envelope when enabled (chained after
  // the persona handler, so it sits at the very top of the prompt)
  // ------------------------------------------------------------------

  pi.on("before_agent_start", async (event) => {
    if (!agentManager.getGuardEnabled()) return;

    return {
      systemPrompt: `${agentManager.buildGuardEnvelope()}\n\n${event.systemPrompt}`,
    };
  });

  // ------------------------------------------------------------------
  // Commands
  // ------------------------------------------------------------------

  pi.registerCommand("agent_guard", {
    description:
      "Toggle the permission-guard XML envelope (on | off | no args = toggle)",

    getArgumentCompletions: async () =>
      ["on", "off"].map((value) => ({ label: value, value })),

    handler: async (args: string | undefined, ctx: ExtensionCommandContext) => {
      const arg = args?.trim().toLowerCase();
      const next =
        arg === "on"
          ? true
          : arg === "off"
            ? false
            : !agentManager.getGuardEnabled();

      agentManager.setGuardEnabled(next, pi);
      ctx.ui.notify(
        next
          ? "Permission guard ON — XML envelope prepended each turn"
          : "Permission guard OFF",
        "info",
      );
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
      return new Promise((resolve) =>
        resolve(
          agents
            .filter((a) => a.name.startsWith(partial.toLowerCase()))
            .map((a) => ({
              label: `${a.icon ? a.icon + " " : ""}${capitalize(a.name)}`,
              value: a.name,
            })),
        ),
      );
    },

    handler: async (args: string | undefined, ctx: ExtensionCommandContext) => {
      try {
        if (!args) {
          const chosen = await openAgentPicker(
            ctx,
            agents,
            agentManager.getCurrentAgent(),
          );
          if (chosen) setAgent(chosen, ctx);
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

        setAgent(requested, ctx);
      } catch (e) {
        logger.log(`Failed to switch agent: ${e}`, "error");
      }
    },
  });

  // ------------------------------------------------------------------
  // Keybindings
  // ------------------------------------------------------------------

  const registerKeys = (
    id: string,
    desc: string,
    handler: (ctx: ExtensionContext) => void | Promise<void>,
  ) => {
    for (const key of shortcuts.get(id) ?? []) {
      pi.registerShortcut(key as KeyId, { description: desc, handler });
    }
  };

  registerKeys(AGENT_SHORTCUT_IDS.next, "Next agent", (ctx) => {
    agentManager.setNextAgent(pi);
    notifySwitch(ctx);
  });

  registerKeys(AGENT_SHORTCUT_IDS.previous, "Previous agent", (ctx) => {
    agentManager.setPreviousAgent(pi);
    notifySwitch(ctx);
  });

  registerKeys(AGENT_SHORTCUT_IDS.picker, "Agent picker", async (ctx) => {
    const chosen = await openAgentPicker(
      ctx,
      agents,
      agentManager.getCurrentAgent(),
    );
    if (chosen) setAgent(chosen, ctx);
  });

  // ------------------------------------------------------------------
  // Tool-call guard — the "ask" gate
  // ------------------------------------------------------------------

  pi.on("tool_call", async (event, ctx) => {
    // Steps exhausted: block all tool calls except read-family.
    if (agentManager.isStepsExhausted()) {
      const permission = event.toolName;
      if (!["read", "grep", "find", "ls"].includes(permission)) {
        return {
          block: true,
          reason: "Step budget exhausted — summarise and stop.",
        };
      }
    }

    const args = (event as unknown as Record<string, unknown>).args as
      Record<string, unknown> | undefined;

    if (!agentManager.requiresConfirmation(event.toolName, args ?? {})) {
      return;
    }

    const family = TOOL_TO_PERMISSION[event.toolName] ?? event.toolName;
    const p = extractPattern(event.toolName, args ?? {});

    // Offer: yes = allow once, always = remember for session, no = deny
    // We use a two-step flow: first approve/deny, then optionally persist.
    const ok = await ctx.ui.confirm(
      "Permission required",
      `Allow \`${event.toolName}\` (${family}: ${p}) as "${agentManager.getCurrentAgent()}"?\n\nYes = allow this call\nNo  = deny and block\n\n(To remember for the session, approve then use /always)`,
    );

    if (!ok) {
      agentManager.deny(event.toolName, args ?? {}, pi);
      logger.log(`\`${event.toolName}\` denied`, "info");
      return {
        block: true,
        reason: "Denied by user",
      };
    }

    // Ask if the user wants to remember this for the session
    const always = await ctx.ui.confirm(
      "Remember?",
      `Always allow \`${event.toolName}\` (${family}: ${p}) for the rest of this session?`,
    );

    if (always) {
      agentManager.approveAlways(event.toolName, args ?? {}, pi);
      logger.log(`\`${event.toolName}\` allowed for this session`, "info");
    } else {
      logger.log(`\`${event.toolName}\` allowed for this call`, "info");
    }
  });

  // ------------------------------------------------------------------
  // Helpers
  // ------------------------------------------------------------------

  function setAgent(
    name: string,
    ctx?: ExtensionContext,
    silent = false,
  ): void {
    agentManager.setAgent(name, pi);
    if (!ctx || silent) return;
    notifySwitch(ctx);
  }

  function notifySwitch(ctx: ExtensionContext): void {
    const { color, name } = agentManager.getCurrentAgentConfig();

    logger.log(
      `Agent → ${logger.fg(color || "accent", capitalize(name))}`,
      "info",
    );

    if (!ctx.isIdle()) {
      logger.log(
        "Switch takes effect after the current interaction completes",
        "info",
      );
    }
  }
}
