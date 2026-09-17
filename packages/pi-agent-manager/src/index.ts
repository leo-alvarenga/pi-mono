import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

import { bootstrap, SetupContext } from "./setup";
import { registerEvents } from "./events";
import { registerCommands } from "./commands";
import { createLogger } from "./cli/logger";

export default async function (pi: ExtensionAPI) {
  const ctx = await bootstrap(pi);
  ctx.logger = createLogger({} as any);

  registerEvents(pi, ctx);
  registerCommands(pi, ctx);
}
