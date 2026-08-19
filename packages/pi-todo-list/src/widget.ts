import type {
  ExtensionAPI,
  ExtensionContext,
  Theme,
} from "@earendil-works/pi-coding-agent";

import { PANEL_TOGGLE_CHORD, WIDGET_KEY } from "./constants";
import type { TodoStore } from "./state";
import type { TodoState } from "./types";
import { getStyledTodoList } from "./utils";

let collapsed = true;
const hideIfEmpty = true;

class TodoWidget {
  private cachedWidth: number | undefined;
  private cachedLines: string[] | undefined;

  constructor(
    private readonly theme: Theme,
    private readonly snapshot: () => TodoState,
    private readonly isCollapsed: () => boolean,
  ) {}

  render(width: number): string[] {
    if (hideIfEmpty && this.snapshot().todos.length === 0) {
      return [];
    }

    if (this.cachedLines !== undefined && this.cachedWidth === width) {
      return this.cachedLines;
    }

    const lines = getStyledTodoList(
      this.snapshot().todos,
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

export function refreshWidget(ctx: ExtensionContext, store: TodoStore): void {
  if (!ctx.hasUI) return;

  ctx.ui.setWidget(
    WIDGET_KEY,
    (_tui, theme) =>
      new TodoWidget(
        theme,
        () => store.getState(ctx),
        () => collapsed,
      ),
  );
}

export function registerTodoWidget(pi: ExtensionAPI, store: TodoStore): void {
  pi.registerShortcut(PANEL_TOGGLE_CHORD, {
    description: "Toggle todos panel",
    handler: (ctx) => {
      collapsed = !collapsed;

      refreshWidget(ctx, store);
    },
  });
}
