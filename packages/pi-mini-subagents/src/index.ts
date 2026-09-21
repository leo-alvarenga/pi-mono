import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { createSubagentRuntime } from "@leo-alvarenga/pi-ext-core";

import { SUBAGENTS_SPEC } from "./config";

export default function (pi: ExtensionAPI): void {
  // Child subagent processes inherit PI_SUBAGENT=1; they must not be able to
  // spawn sub-subagents, so the tool/widget/command never register there
  if (process.env.PI_SUBAGENT) return;

  createSubagentRuntime(pi, SUBAGENTS_SPEC);
}
