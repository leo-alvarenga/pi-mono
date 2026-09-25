import { getAgentDir } from "@earendil-works/pi-coding-agent";
import type {
  ExtensionContext,
  Theme,
} from "@earendil-works/pi-coding-agent";
import type { TUI } from "@earendil-works/pi-tui";
import { truncateToWidth } from "@earendil-works/pi-tui";
import type { SessionRecordStore } from "@leo-alvarenga/pi-ext-core";

import { WIDGET_KEY } from "./constants";
import { openGoalDb } from "./db/open";
import { getGoalStats } from "./db/queries";
import type { AutonomousState } from "./types";

// ponytail: module-level holder so loop/answer can refresh without a store reference
let activeRefresh: ((ctx: ExtensionContext) => void) | null = null;

export function refreshAutonomousWidget(ctx: ExtensionContext): void {
  activeRefresh?.(ctx);
}

export function registerAutonomousWidget(
  store: SessionRecordStore<AutonomousState>,
): { refresh(ctx: ExtensionContext): void } {
  function refresh(ctx: ExtensionContext): void {
    if (!ctx.hasUI) return;

    ctx.ui.setWidget(
      WIDGET_KEY,
      (_tui: TUI, theme: Theme) => {
        let cached: string[] | undefined;
        let cachedWidth: number | undefined;

        return {
          invalidate() {
            cached = undefined;
            cachedWidth = undefined;
          },

          render(width: number): string[] {
            if (cached !== undefined && cachedWidth === width) return cached;

            const s = store.getState(ctx);
            if (!s.activeGoalId || !s.dbPath) {
              cached = [];
              cachedWidth = width;
              return cached;
            }

            const db = openGoalDb(getAgentDir(), s.activeGoalId);
            let stats: ReturnType<typeof getGoalStats>;
            try {
              stats = getGoalStats(db);
            } finally {
              db.close();
            }

            const line = [
              theme.fg("accent", s.activeGoalTitle ?? "Untitled"),
              theme.fg("muted", `(${s.activeGoalId})`),
              `| Epics (${stats.epicTotal}): ${stats.epicDone} Done * ${stats.epicInProgress} In progress`,
              `| Milestones ${stats.msDone}/${stats.msTotal}`,
            ].join(" ");

            cached = [truncateToWidth(line, width)];
            cachedWidth = width;
            return cached;
          },
        };
      },
    );
  }

  activeRefresh = refresh;

  return { refresh };
}
