import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import {
  createSessionStore,
  type SessionRecordStore,
} from "@leo-alvarenga/pi-ext-core";

import { STATE_ENTRY } from "./constants";
import type { AutonomousState } from "./types";

export function createAutonomousStore(
  pi: ExtensionAPI,
  onChanged?: (next: AutonomousState, ctx: ExtensionContext) => void,
): SessionRecordStore<AutonomousState> {
  return createSessionStore<AutonomousState>({
    entryType: STATE_ENTRY,

    empty: () => ({
      activeGoalId: null,
      activeGoalTitle: null,
      phase: "idle",
      dbPath: null,
      goalFilePath: null,
    }),

    onChange: (next, ctx) => {
      pi.appendEntry(STATE_ENTRY, next);
      onChanged?.(next, ctx);
    },
    snapshotOf: (entry) => entry.data as AutonomousState | undefined,
  });
}
