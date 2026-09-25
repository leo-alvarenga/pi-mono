import { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { killAllRunning } from "../headless/run";
import { SessionRecordStore, SubagentSpec, SubagentState } from "..";

export function hookEvents(
  pi: ExtensionAPI,
  store: SessionRecordStore<SubagentState>,
  spec: SubagentSpec,
): void {
  pi.on("session_start", (_event, ctx) => store.replay(ctx));
  pi.on("session_tree", (_event, ctx) => store.replay(ctx));
  pi.on("session_before_compact", (_event, ctx) => store.persistSnapshot(ctx));

  pi.on("session_shutdown", (_event, ctx) => {
    killAllRunning();

    if (ctx.hasUI) ctx.ui.setWidget(spec.panel.widgetKey, undefined);
  });
}
