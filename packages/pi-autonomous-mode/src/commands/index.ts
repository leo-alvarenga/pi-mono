import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import type { SessionRecordStore } from "@leo-alvarenga/pi-ext-core";

import type { AutonomousState } from "../types";
import { COMMAND_NAME } from "../constants";
import { handleStart } from "./start";
import { handleResume } from "./resume";
import { handleStatus } from "./status";
import { handleList } from "./list";
import { handleAbort } from "./abort";
import { handleAnswer } from "./answer";

const SUBCOMMANDS = ["start", "resume", "status", "list", "abort", "answer"];

export function registerAutonomousCommand(
  pi: ExtensionAPI,
  store: SessionRecordStore<AutonomousState>,
): void {
  pi.registerCommand(COMMAND_NAME, {
    description:
      "Autonomous supervisor: start <file> | resume <id> | status | list | abort | answer <milestone-id> <answers>",

    async getArgumentCompletions(prefix: string) {
      return SUBCOMMANDS.filter((s) => s.startsWith(prefix)).map((s) => ({
        label: s,
        value: s,
      }));
    },

    handler: async (args, ctx) => {
      const [subcommand, ...rest] = (args ?? "").trim().split(/\s+/);
      const tail = rest.join(" ");

      switch (subcommand) {
        case "start":
          return handleStart(tail, ctx, store, pi);

        case "resume":
          return handleResume(tail, ctx, store, pi);

        case "status":
          return handleStatus(tail, ctx, store);

        case "list":
          return handleList(tail, ctx);

        case "abort":
          return handleAbort(tail, ctx, store);
        case "answer":
          return handleAnswer(tail, ctx, store, pi);
        default:
          ctx.ui.notify(
            "Usage: /autonomous start <file> | resume <id> | status | list | abort | answer <milestone-id> <answers>",
            "error",
          );
      }
    },
  });
}
