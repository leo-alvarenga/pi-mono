import type { ExtensionAPI, ExtensionContext, Theme } from "@earendil-works/pi-coding-agent";

import { PANEL_TOGGLE_CHORD, WIDGET_KEY } from "./constants";
import type { SubagentStore } from "./state";
import type { SubagentState } from "./types";
import { getStyledSubagentList } from "./utils";

let collapsed = true;

class SubagentWidget {
  private cachedWidth: number | undefined;
  private cachedLines: string[] | undefined;

  constructor(
    private readonly theme: Theme,
    private readonly snapshot: () => SubagentState,
    private readonly isCollapsed: () => boolean,
  ) {}

  render(width: number): string[] {
    if (this.snapshot().records.length === 0) return [];

    if (this.cachedLines !== undefined && this.cachedWidth === width) {
      return this.cachedLines;
    }

    const lines = getStyledSubagentList(
      this.snapshot().records,
      this.theme,
      width,
      this.isCollapsed(),
    );

    this.cachedWidth = width;
    this.cachedLines = lines;
    return lines;
  }

  invalidate(): void {
    this.cachedWidth = undefined;
    this.cachedLines = undefined;
  }
}

export function refreshWidget(ctx: ExtensionContext, store: SubagentStore): void {
  if (!ctx.hasUI) return;

  ctx.ui.setWidget(
    WIDGET_KEY,
    (_tui, theme) =>
      new SubagentWidget(
        theme,
        () => store.getState(ctx),
        () => collapsed,
      ),
  );
}

export function registerSubagentWidget(pi: ExtensionAPI, store: SubagentStore): void {
  pi.registerShortcut(PANEL_TOGGLE_CHORD, {
    description: "Toggle subagents panel",
    handler: (ctx) => {
      collapsed = !collapsed;
      refreshWidget(ctx, store);
    },
  });
}
