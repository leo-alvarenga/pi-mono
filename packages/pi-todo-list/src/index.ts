import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

import { registerTodosCommand } from "./command";
import { STATE_ENTRY, WIDGET_KEY } from "./constants";
import { createTodoStore } from "./state";
import { registerTodoTool, registerTodoCompleteAllTool } from "./tool";
import { registerTodoWidget } from "./widget";

export default function (pi: ExtensionAPI): void {
  const store = createTodoStore((snapshot) =>
    pi.appendEntry(STATE_ENTRY, snapshot),
  );

  const panelControls = registerTodoWidget(pi, store);

  registerTodoTool(pi, store);
  registerTodoCompleteAllTool(pi, store);
  registerTodosCommand(pi, store);

  pi.on("session_start", (_event, ctx) => {
    store.replay(ctx);
    panelControls.refresh(ctx);
  });
  pi.on("session_tree", (_event, ctx) => {
    store.replay(ctx);
    panelControls.refresh(ctx);
  });
  pi.on("session_before_compact", (_event, ctx) => store.persistSnapshot(ctx));
  pi.on("session_shutdown", (_event, ctx) => {
    if (ctx.hasUI) ctx.ui.setWidget(WIDGET_KEY, undefined);
  });
}
