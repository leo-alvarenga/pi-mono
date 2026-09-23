import { ExtensionContext } from "@earendil-works/pi-coding-agent";

import { readGit } from "./git";
import { readAgentModeFromSession } from "./agent";

export function getData(ctx: ExtensionContext) {
  return {
    git: readGit(ctx.cwd),
    agentMode: readAgentModeFromSession(ctx),
  };
}
