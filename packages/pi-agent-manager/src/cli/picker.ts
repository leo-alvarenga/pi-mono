import type { ExtensionContext } from "@earendil-works/pi-coding-agent";
import { openSelectSearch } from "@leo-alvarenga/pi-ext-core";

import type { AgentConfig } from "../agent/types";
import { getPermissionBadges, capitalize } from "./help";

export async function openAgentPicker(
  ctx: ExtensionContext,
  agents: AgentConfig[],
  current: string,
): Promise<string | null> {
  return openSelectSearch(
    ctx.ui,
    "Select an agent",
    agents
      .filter((a) => !a.hidden)
      .map((agent) => ({
        value: agent.name,
        label: `${agent.icon ? agent.icon + " " : ""}${capitalize(agent.name)}${agent.name === current ? "  \u25cf current" : ""}`,
        description: `${getPermissionBadges(agent)}  \u2500  ${agent.description}`,
      })),
  );
}
