import type { ExtensionAPI, Theme } from "@earendil-works/pi-coding-agent";
import { Text } from "@earendil-works/pi-tui";

import { groupByStatus } from "./core";
import { REPORT_ENTRY } from "./constants";
import type { TodoStore } from "./state";
import type { Todo } from "./types";
import { getStyledTodo } from "./utils";

const renderList = (todos: Todo[], theme: Theme): string => {
  if (todos.length === 0) return `  ${theme.fg("dim", "No todos.")}`;

  const { completed, inProgress, pending } = groupByStatus(todos);
  const lines: string[] = [];

  const section = (label: string, items: Todo[]): void => {
    if (items.length === 0) return;

    lines.push(`  ${theme.fg("muted", `${label} (${items.length})`)}`);
    for (const t of items) lines.push(getStyledTodo(t, todos, theme));

    lines.push("");
  };

  section("Completed", completed);
  section("In progress", inProgress);
  section("Pending", pending);

  return lines.join("\n");
};

export function registerTodosCommand(pi: ExtensionAPI, store: TodoStore): void {
  pi.registerCommand("todos", {
    description: "Show all todos grouped by status",
    handler: async (_args, ctx) => {
      if (!ctx.hasUI) {
        ctx.ui.notify("/todos requires interactive mode", "error");
        return;
      }

      pi.appendEntry(REPORT_ENTRY, { todos: [...store.getState(ctx).todos] });
    },
  });

  pi.registerEntryRenderer<{ todos: Todo[] }>(
    REPORT_ENTRY,
    (entry, _options, theme) => {
      return new Text(renderList(entry.data?.todos ?? [], theme), 0, 0);
    },
  );
}
