import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";

import { AGENT_DATA_KEY } from "./constants";
import { BUILT_IN_AGENTS, DEFAULT_AGENT } from "./agent/builtin";
import { createAgentManager } from "./agent/manager";
import { loadAgentShortcuts, loadUserAgents } from "./agent/config";
import { createLogger, Logger } from "./cli/logger";
import { capitalize } from "./cli/help";
import type { AgentManager } from "./agent/manager";

export interface SetupContext {
  agents: any[];
  agentManager: AgentManager;
  shortcuts: Map<string, string[]>;
  configErrors: string[];
  logger: Logger;
}

export async function bootstrap(pi: ExtensionAPI): Promise<SetupContext> {
  const { agents: userAgents, errors: configErrors } = await loadUserAgents();
  const userNames = new Set(userAgents.map((a) => a.name));
  const agents = [
    ...BUILT_IN_AGENTS.filter((a) => !userNames.has(a.name)),
    ...userAgents,
  ];

  const agentManager = createAgentManager(agents);
  const shortcuts = loadAgentShortcuts();

  return {
    agents,
    agentManager,
    shortcuts,
    configErrors,
    logger: null as any, // Will be set in session_start
  };
}

export function setAgent(
  name: string,
  agentManager: AgentManager,
  pi: ExtensionAPI,
  ctx?: ExtensionContext,
  silent = false,
): void {
  agentManager.setAgent(name, pi);
  if (!ctx || silent) return;
  notifySwitch(ctx, agentManager);
}

export function notifySwitch(
  ctx: ExtensionContext,
  agentManager: AgentManager,
): void {
  const { color, name } = agentManager.getCurrentAgentConfig();
  const logger = ctx.logger; // Assuming logger is available on ctx

  if (logger) {
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
