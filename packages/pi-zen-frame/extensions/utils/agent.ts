/**
 * Domain: agent-mode (pi-agent-manager) integration.
 * Optional — no hard dependency on the manager.
 */
import type { ExtensionContext } from "@earendil-works/pi-coding-agent";

import { PI_AGENT_MANAGER_AGENT_DATA_KEY } from "../config/constants";
import { AgentMode, AgentState } from "../components/types";

/** Walk the session branch (newest first) for the latest pi-agent-manager agent
 *  entry. Returns null when the manager is absent or nothing is found. */
export function readAgentModeFromSession(ctx: ExtensionContext): AgentMode {
  try {
    const entries = [...ctx.sessionManager.getBranch()].reverse();
    for (const entry of entries) {
      const e = entry as { type?: string; customType?: string; data?: unknown };

      if (
        e.type !== "custom" ||
        e.customType !== PI_AGENT_MANAGER_AGENT_DATA_KEY
      ) {
        continue;
      }

      const state = e.data as AgentState | undefined;

      if (state) {
        return {
          icon: state.currentAgentConfig?.icon,
          color: state.currentAgentConfig?.color,
          name:
            state.currentAgentLabel ||
            state.currentAgent ||
            state.currentAgentConfig?.name,
        };
      }
    }
  } catch {
    // pi-agent-manager absent or session unreadable — silently stay unknown.
  }

  return null;
}
