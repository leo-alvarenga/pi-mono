import { StringEnum } from "@earendil-works/pi-ai";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Text } from "@earendil-works/pi-tui";
import { Type } from "typebox";

import { STATUSES } from "./constants";
import { applyAction } from "./core";
import type { TodoStore } from "./state";
import type { TodoDetails, TodoState } from "./types";

const TodoParams = Type.Object({
  action: StringEnum(["add", "update", "remove", "list", "clear"] as const),
  text: Type.Optional(
    Type.String({
      description: "Task text (required for add; optional for update)",
    }),
  ),
  texts: Type.Optional(
    Type.Array(Type.String(), {
      description:
        "Task texts; add all at once (optional; used with action=add)",
    }),
  ),
  id: Type.Optional(
    Type.Number({
      description: "Task id (required for remove; alternative to ids)",
    }),
  ),
  ids: Type.Optional(
    Type.Array(Type.Number(), {
      description:
        "Task ids; remove all at once (optional; used with action=remove)",
    }),
  ),
  status: Type.Optional(StringEnum([...STATUSES] as const)),
  blockedBy: Type.Optional(
    Type.Array(Type.Number(), { description: "Task ids this task depends on" }),
  ),
});

export function registerTodoTool(pi: ExtensionAPI, store: TodoStore): void {
  pi.registerTool({
    name: "todo",
    label: "Todo",
    parameters: TodoParams,
    description:
      "Manage the session todo list. Actions: add (text or texts), update (id, optional status/text/blockedBy), remove (id or ids), list, clear",
    promptSnippet:
      "Manage the session todo list: add/update/remove/list/clear tasks",
    promptGuidelines: [
      "Always track the work using the todo tools.",
      "Record each item the user wants tracked with todo add.",
      "Keep todos current: todo update to completed as you finish items, todo remove for dropped ones.",
      "When the user says 'complete everything' / 'done with all', use todo_complete_all instead of looping todo update.",
    ],

    async execute(toolCallId, params, _signal, _onUpdate, ctx) {
      const current = store.getState(ctx);
      const result = applyAction(current, params);

      if (!result.ok) {
        return {
          content: [{ type: "text", text: result.error }],
          details: {
            action: params.action,
            todos: [...current.todos],
            nextId: current.nextId,
            error: result.error,
          } satisfies TodoDetails,
        };
      }

      store.commit(ctx, result.state);
      return {
        content: [{ type: "text", text: result.text }],
        details: {
          action: params.action,
          todos: [...result.state.todos],
          nextId: result.state.nextId,
        } satisfies TodoDetails,
      };
    },

    renderCall(args, theme, _context) {
      let text =
        theme.fg("toolTitle", theme.bold("todo ")) +
        theme.fg("muted", args.action);
      if (args.text) text += ` ${theme.fg("dim", `"${args.text}"`)}`;
      if (args.id !== undefined)
        text += ` ${theme.fg("accent", `#${args.id}`)}`;
      return new Text(text, 0, 0);
    },

    renderResult(result, _options, theme, _context) {
      const details = result.details as TodoDetails | undefined;
      if (details?.error)
        return new Text(theme.fg("error", `Error: ${details.error}`), 0, 0);
      const text = result.content[0];
      const msg = text?.type === "text" ? text.text : "";
      if (details?.action === "list")
        return new Text(theme.fg("muted", msg), 0, 0);
      return new Text(theme.fg("success", "✓ ") + theme.fg("muted", msg), 0, 0);
    },
  });
}

export function registerTodoCompleteAllTool(
  pi: ExtensionAPI,
  store: TodoStore,
): void {
  pi.registerTool({
    name: "todo_complete_all",
    label: "Complete All Todos",
    parameters: Type.Object({}),
    description:
      "Mark every todo as completed and clear the list in one shot. The result tells the user how many items were completed.",
    promptSnippet:
      "When the user says 'complete everything' / 'done with all', use todo_complete_all instead of looping todo update.",

    async execute(_toolCallId, _params, _signal, _onUpdate, ctx) {
      const current = store.getState(ctx);
      const n = current.todos.length;
      const cleared: TodoState = { todos: [], nextId: 1 };
      store.commit(ctx, cleared);
      return {
        content: [
          { type: "text", text: `All ${n} todos completed and cleared` },
        ],
        details: {
          action: "clear",
          todos: [],
          nextId: 1,
        } satisfies TodoDetails,
      };
    },

    renderCall(_args, theme) {
      return new Text(
        theme.fg("toolTitle", theme.bold("todo_complete_all")),
        0,
        0,
      );
    },

    renderResult(result, _options, theme) {
      const text = result.content[0];
      return new Text(
        theme.fg("success", "✓ ") +
          theme.fg("muted", text?.type === "text" ? text.text : ""),
        0,
        0,
      );
    },
  });
}
