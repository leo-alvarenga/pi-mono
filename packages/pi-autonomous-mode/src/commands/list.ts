import { getAgentDir } from "@earendil-works/pi-coding-agent";
import type { ExtensionCommandContext } from "@earendil-works/pi-coding-agent";
import { openIndexDb } from "../db/open";
import { listGoals } from "../db/queries";

export async function handleList(
  _args: string,
  ctx: ExtensionCommandContext,
): Promise<void> {
  const agentDir = getAgentDir();

  const indexDb = openIndexDb(agentDir);
  const goals = listGoals(indexDb);
  indexDb.close();

  if (goals.length === 0) {
    ctx.ui.notify("No goals found.", "info");
    return;
  }

  const lines = goals.map((g) => `[${g.status}] ${g.title} (${g.id})`);
  ctx.ui.notify(lines.join("\n"), "info");
}
