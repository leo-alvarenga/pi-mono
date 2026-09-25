import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import type { SessionRecordStore } from "@leo-alvarenga/pi-ext-core";

import type { AutonomousState } from "../types";
import { COMMAND_NAME } from "../constants";
import { handleStart } from "./start";
import { handleResume } from "./resume";
import { handleStatus } from "./status";
import { handleList } from "./list";
import { handleAbort } from "./abort";

export function registerAutonomousCommand(
  pi: ExtensionAPI,
  store: SessionRecordStore<AutonomousState>,
): void {
  pi.registerCommand(COMMAND_NAME, {
    description:
      "Autonomous supervisor: start <file> | resume <id> | status | list | abort",

    handler: async (args, ctx) => {
      const [subcommand, ...rest] = (args ?? "").trim().split(/\s+/);
      const tail = rest.join(" ");

      switch (subcommand) {
        case "start":
          return handleStart(tail, ctx, store);

        case "resume":
          return handleResume(tail, ctx, store);

        case "status":
          return handleStatus(tail, ctx, store);

        case "list":
          return handleList(tail, ctx);

        case "abort":
          return handleAbort(tail, ctx, store);

        default:
          ctx.ui.notify(
            "Usage: /autonomous start <file> | resume <id> | status | list | abort",
            "error",
          );
      }
    },
  });
}
