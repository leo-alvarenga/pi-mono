import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export default function (pi: ExtensionAPI) {
  pi.on("session_start", (_event, ctx) => {
    ctx.ui.notify(
      "@leo-alvarenga/pi-mini-subagents is deprecated and no longer works. Uninstall it and migrate to another subagent solution (e.g. pi-subagents).",
      "warning",
    );
  });
}
