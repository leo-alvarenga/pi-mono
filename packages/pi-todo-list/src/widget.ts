import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import {
  createPanelWidget,
  type PanelWidgetSpec,
  type SessionRecordStore,
} from "@leo-alvarenga/pi-ext-core";

import { MAX_PANEL_ROWS, PANEL_TOGGLE_CHORD, WIDGET_KEY } from "./constants";
import type { TodoState } from "./types";
import { getHeader, getSortedTodos, getStyledTodo } from "./utils";

export function registerTodoWidget(
  pi: ExtensionAPI,
  store: SessionRecordStore<TodoState>,
) {
  const spec: PanelWidgetSpec<TodoState> = {
    store,
    widgetKey: WIDGET_KEY,
    maxRows: MAX_PANEL_ROWS,
    toggleChord: PANEL_TOGGLE_CHORD,
    moreLabel: (n) => `… +${n} more`,
    emptyText: "No todos yet. Ask the agent to add some!",
    header: (s, theme, isCollapsed) => getHeader(s.todos, theme, isCollapsed),

    rows: (s, theme) =>
      getSortedTodos(s.todos).map((t) => getStyledTodo(t, s.todos, theme)),

    isEmpty: (s) =>
      s.todos.length === 0 || s.todos.every((t) => t.status === "completed"),
  };

  const controls = createPanelWidget(pi, spec);
  controls.register();

  return controls;
}
