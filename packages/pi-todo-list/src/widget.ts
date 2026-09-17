import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

import { createPanelWidget, PanelWidgetSpec } from "@leo-alvarenga/pi-ext-core";

import { PANEL_TOGGLE_CHORD, WIDGET_KEY } from "./constants";
import type { TodoStore } from "./state";
import type { TodoState } from "./types";
import { getStyledTodoList } from "./utils";

export function registerTodoWidget(pi: ExtensionAPI, store: TodoStore) {
  const spec: PanelWidgetSpec<TodoState> = {
    widgetKey: WIDGET_KEY,
    maxRows: 20,
    emptyText: "No todos",
    toggleChord: PANEL_TOGGLE_CHORD,
    isEmpty: (s) => s.todos.length === 0,
    store,
    moreLabel: (n) => `…and ${n} more`,
    header: (s, theme, isCollapsed) =>
      theme.fg("muted", isCollapsed ? "▶ Todos" : "▼ Todos"),
    rows: (s, theme) => getStyledTodoList(s.todos, theme, 80, false),
  };

  const controls = createPanelWidget(pi, spec);
  controls.register();
  return controls;
}

