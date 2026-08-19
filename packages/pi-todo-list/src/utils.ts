import { Theme } from "@earendil-works/pi-coding-agent";
import { truncateToWidth } from "@earendil-works/pi-tui";

import { Todo, TodoStatus } from "./types";
import { MAX_PANEL_ROWS, PANEL_STATE_ICON, STATUS_STYLES } from "./constants";

export function getStyledTodoList(
  todos: Todo[],
  th: Theme,
  width: number,
  isCollapsed?: boolean,
): string[] {
  const indent = (str: string, level = 1) => "  ".repeat(Math.abs(level)) + str;

  const lines: string[] = [
    truncateToWidth(
      indent(getStyledTodoListHeader(todos, th, isCollapsed)),
      width,
    ),
  ];

  if (!isCollapsed) {
    lines.push("");

    if (todos.length === 0) {
      lines.push(
        truncateToWidth(
          indent(th.fg("dim", "No todos yet. Ask the agent to add some!"), 2),
          width,
        ),
      );
    } else {
      const visible = todos.slice(0, MAX_PANEL_ROWS);

      for (const t of visible) {
        lines.push(
          truncateToWidth(indent(getStyledTodo(t, todos, th), 2), width),
        );
      }

      if (todos.length > visible.length) {
        lines.push(
          truncateToWidth(
            indent(th.fg("dim", `… +${todos.length - visible.length} more`), 3),
            width,
          ),
        );
      }
    }
  }

  lines.push("");

  return lines;
}

export function getStyledTodoListHeader(
  todos: Todo[],
  th: Theme,
  isCollapsed?: boolean,
): string {
  const count = todos.reduce<Record<TodoStatus, number>>(
    (acc, t) => {
      acc[t.status] = (acc[t.status] ?? 0) + 1;
      return acc;
    },
    { pending: 0, "in-progress": 0, completed: 0 },
  );

  const collapseState = isCollapsed ? "collapsed" : "expanded";

  const statuses: TodoStatus[] = ["pending", "in-progress", "completed"];

  const counter = statuses
    .map((s) => {
      const { icon, color } = STATUS_STYLES[s] ?? STATUS_STYLES.pending;

      return th.fg(color, `${icon}${count[s] ?? 0}`);
    })
    .join(th.fg("dim", " / "));

  return th.fg(
    "accent",
    `${PANEL_STATE_ICON[collapseState]}  Todos - ${counter}`,
  );
}

export function getStyledTodo(t: Todo, todos: Todo[], th: Theme): string {
  const { icon, fg, bold, strikethrough, color } =
    STATUS_STYLES[t.status] ?? STATUS_STYLES.pending;

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
