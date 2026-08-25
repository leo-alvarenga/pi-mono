import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

import { registerSubagentsCommand } from "./command";
import { STATE_ENTRY, WIDGET_KEY } from "./constants";
import { killAllRunning } from "./spawn";
import { SubagentStore } from "./state";
import { registerMiniSubagentTool } from "./tool";
import { registerSubagentWidget, refreshWidget } from "./widget";

export default function (pi: ExtensionAPI): void {
  // Child subagent processes inherit PI_SUBAGENT=1; they must not be able to
  // spawn sub-subagents, so the tool/widget/command never register there.
  if (process.env.PI_SUBAGENT) return;

  const store = new SubagentStore(
    (snapshot) => pi.appendEntry(STATE_ENTRY, snapshot),
    (ctx) => refreshWidget(ctx, store),
  );

  registerMiniSubagentTool(pi, store);
  registerSubagentsCommand(pi, store);
  registerSubagentWidget(pi, store);

  pi.on("session_start", (_event, ctx) => store.replay(ctx));
  pi.on("session_tree", (_event, ctx) => store.replay(ctx));
  pi.on("session_before_compact", (_event, ctx) => store.persistSnapshot(ctx));
  pi.on("session_shutdown", (_event, ctx) => {
    killAllRunning();
    if (ctx.hasUI) ctx.ui.setWidget(WIDGET_KEY, undefined);
  });
}
