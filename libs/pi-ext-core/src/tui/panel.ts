import type {
  ExtensionAPI,
  ExtensionContext,
  Theme,
} from "@earendil-works/pi-coding-agent";
import { truncateToWidth } from "@earendil-works/pi-tui";
import type { KeyId } from "@earendil-works/pi-tui";

import type { SessionRecordStore } from "../session/store";

/**
 * Create a collapsible TUI panel widget backed by a session store.
 * Collapse state lives in the closure (resets on /reload — intentional).
 * Consumer: pi-mini-subagents (via createSubagentRuntime), pi-todo-list (next).
 */
export function createPanelWidget<T>(
  pi: ExtensionAPI,
  spec: {
    widgetKey: string;
    toggleChord: KeyId;
    store: SessionRecordStore<T>;
    isEmpty(s: T): boolean;
    header(s: T, theme: Theme, isCollapsed: boolean): string;
    rows(
      s: T,
      theme: Theme,
      opts: { isCollapsed: boolean; maxRows: number },
    ): string[];
    maxRows: number;
    emptyText: string;
    moreLabel(overflow: number): string;
  },
): { refresh(ctx: ExtensionContext): void; register(): void } {
  // ponytail: closure collapse resets on /reload — preserves existing behavior
  let collapsed = true;

  class PanelWidget {
    private cachedWidth: number | undefined;
    private cachedLines: string[] | undefined;

    constructor(
      private readonly theme: Theme,
      private readonly snapshot: () => T,
    ) {}

    render(width: number): string[] {
      const s = this.snapshot();
      if (spec.isEmpty(s)) return [];

      if (this.cachedLines !== undefined && this.cachedWidth === width) {
        return this.cachedLines;
      }

      const indent = (str: string, level = 1) =>
        "  ".repeat(Math.abs(level)) + str;

      const lines: string[] = [
        truncateToWidth(
          indent(spec.header(s, this.theme, collapsed)),
          width,
        ),
      ];

      if (!collapsed) {
        lines.push("");
        const all = spec.rows(s, this.theme, {
          isCollapsed: false,
          maxRows: spec.maxRows,
        });
        if (all.length === 0) {
          lines.push(
            truncateToWidth(
              indent(this.theme.fg("dim", spec.emptyText), 2),
              width,
            ),
          );
        } else {
          const visible = all.slice(0, spec.maxRows);
          for (const row of visible) {
            lines.push(truncateToWidth(indent(row, 2), width));
          }
          if (all.length > visible.length) {
            lines.push(
              truncateToWidth(
                indent(
                  this.theme.fg(
                    "dim",
                    spec.moreLabel(all.length - visible.length),
                  ),
                  3,
                ),
                width,
              ),
            );
          }
        }
      }

      lines.push("");
      this.cachedWidth = width;
      this.cachedLines = lines;
      return lines;
    }

    invalidate(): void {
      this.cachedWidth = undefined;
      this.cachedLines = undefined;
    }
  }

  function refresh(ctx: ExtensionContext): void {
    if (!ctx.hasUI) return;
    ctx.ui.setWidget(
      spec.widgetKey,
      (_tui, theme) =>
        new PanelWidget(theme, () => spec.store.getState(ctx)),
    );
  }

  function register(): void {
    pi.registerShortcut(spec.toggleChord, {
      description: `Toggle ${spec.widgetKey} panel`,
      handler: (ctx) => {
        collapsed = !collapsed;
        refresh(ctx);
      },
    });
  }

  return { refresh, register };
}
