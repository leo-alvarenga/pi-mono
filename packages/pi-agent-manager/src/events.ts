import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";

import {
  AGENT_DATA_KEY,
  AGENT_PROFILE_END_TAG,
  AGENT_PROFILE_START_TAG,
} from "./constants";
import { isValidAgent, capitalize } from "./cli/help";
import type { AgentState } from "./agent/types";
import { TOOL_TO_PERMISSION, extractPattern } from "./permission/mapping";
import type { AgentManager } from "./agent/manager";
import type { Logger } from "./cli/logger";
import { setAgent, notifySwitch } from "./setup";

export function registerEvents(
  pi: ExtensionAPI,
  ctx: {
    agents: any[];
    agentManager: AgentManager;
    logger: Logger;
  },
): void {
  const { agents, agentManager, logger } = ctx;

  // session_start: restore last agent using SessionRecordStore
  pi.on("session_start", async (_, extensionCtx) => {
    agentManager.initialize(pi);

    if (ctx.agents.some((a: any) => a.configErrors?.length)) {
      logger.log("Some agents had config errors; check directory", "error");
    }

    // Use SessionRecordStore to restore AgentState
    const store = require("@leo-alvarenga/pi-ext-core").createSessionStore({
      empty: () => ({ currentAgent: "default", currentAgentLabel: "", currentAgentConfig: null, guardEnabled: false }),
      entryType: AGENT_DATA_KEY,
      snapshotOf: (entry: any) => entry.data as Partial<AgentState> | undefined,
    });

    const state = store.getState(extensionCtx);
    if (state?.currentAgent && isValidAgent(state.currentAgent, agents)) {
      setAgent(state.currentAgent, agentManager, pi, extensionCtx, true);
    } else {
      setAgent("default", agentManager, pi, extensionCtx, true);
    }

    if (state?.guardEnabled) agentManager.setGuardEnabled(true, pi);
  });

  let previousAgent: string | undefined;

  // before_agent_start: inject persona
  pi.on("before_agent_start", async (event) => {
    if (previousAgent === agentManager.getCurrentAgent()) {
      return { systemPrompt: event.systemPrompt };
    }

    previousAgent = agentManager.getCurrentAgent();
    let base = (event.systemPrompt || "").trim();

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

  // Permission guard: prepend XML envelope
  pi.on("before_agent_start", async (event) => {
    if (!agentManager.getGuardEnabled()) return;
    return {
      systemPrompt: `${agentManager.buildGuardEnvelope()}\n\n${event.systemPrompt}`,
    };
  });

  // tool_call: guard gate with confirmation
  pi.on("tool_call", async (event, extensionCtx) => {
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
      | Record<string, unknown>
      | undefined;

    if (!agentManager.requiresConfirmation(event.toolName, args ?? {})) {
      return;
    }

    const family = TOOL_TO_PERMISSION[event.toolName] ?? event.toolName;
    const p = extractPattern(event.toolName, args ?? {});

    const ok = await extensionCtx.ui.confirm(
      "Permission required",
      `Allow \`${event.toolName}\` (${family}: ${p}) as "${agentManager.getCurrentAgent()}"?\n\nYes = allow this call\nNo  = deny and block`,
    );

    if (!ok) {
      agentManager.deny(event.toolName, args ?? {}, pi);
      logger.log(`\`${event.toolName}\` denied`, "info");
      return {
        block: true,
        reason: "Denied by user",
      };
    }

    const always = await extensionCtx.ui.confirm(
      "Remember?",
      `Always allow \`${event.toolName}\` for this session?`,
    );

    if (always) {
      agentManager.approveAlways(event.toolName, args ?? {}, pi);
      logger.log(`\`${event.toolName}\` allowed for session`, "info");
    } else {
      logger.log(`\`${event.toolName}\` allowed for this call`, "info");
    }
  });
}
