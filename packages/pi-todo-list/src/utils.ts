import { Theme } from "@earendil-works/pi-coding-agent";
import { PANEL_STATE_ICON } from "@leo-alvarenga/pi-ext-core";

import type { Todo, TodoStatus } from "./types";
import { MAX_PANEL_ROWS, STATUS_STYLES } from "./constants";

/** Panel header: collapsed/expanded icon plus per-status counts. */
export function getHeader(
  todos: Todo[],
  th: Theme,
  isCollapsed: boolean,
): string {
  const count = todos.reduce<Record<TodoStatus, number>>(
    (acc, t) => {
      acc[t.status] = (acc[t.status] ?? 0) + 1;
      return acc;
    },
    { pending: 0, "in-progress": 0, completed: 0 },
  );

  const counter = (["pending", "in-progress", "completed"] as TodoStatus[])
    .map((s) => {
      const { icon, color = "text" } =
        STATUS_STYLES[s] ?? STATUS_STYLES.pending;

      return th.fg(color, `${icon}${count[s] ?? 0}`);
    })
    .join(th.fg("dim", " / "));

  const state = isCollapsed ? "collapsed" : "expanded";

  return th.fg("accent", `${PANEL_STATE_ICON[state]} 󰄲 Todos - ${counter}`);
}

export function getSortedTodos(todos: Todo[]): Todo[] {
  if (todos.length <= MAX_PANEL_ROWS) return todos;

  const weights: Record<TodoStatus, number> = {
    pending: 0,
    completed: 2,
    "in-progress": 1,
  };

  const sorted = todos.sort((a, b) => {
    const wa = weights[a.status];
    const wb = weights[b.status];

    if (wa === wb) return a.id - b.id;

    return wa - wb;
  });

  return sorted;
}

/** One panel/report row for a todo. */
export function getStyledTodo(t: Todo, todos: Todo[], th: Theme): string {
  const {
    fg,
    bold,
    icon,
    strikethrough,
    color = "text",
  } = STATUS_STYLES[t.status] ?? STATUS_STYLES.pending;

  const check = th.fg(color, icon);
  const id = th.fg("accent", `#${t.id}`);

  let text = th.fg(fg, t.text);

  if (bold) text = th.bold(text);
  if (strikethrough) text = th.strikethrough(text);

  const waiting = t.blockedBy.filter((b) => {
    const bt = todos.find((x) => x.id === b);

    return !bt || bt.status !== "completed";
  });

  let line = `  ${check} ${id} ${text}`;
  if (waiting.length > 0) {
    line += th.fg(
      "dim",
      ` (blocked by ${waiting.map((b) => `#${b}`).join(", ")})`,
    );
  }

  return line;
}
