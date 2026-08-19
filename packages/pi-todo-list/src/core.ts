import { MAX_TEXT_LENGTH } from "./constants";
import type { Todo, TodoAction, TodoState, TodoStatus } from "./types";

export type Patch = {
  text?: string;
  status?: TodoStatus;
  blockedBy?: number[];
};

export type ActionResult =
  { ok: true; state: TodoState; text: string } | { ok: false; error: string };

const clone = (todos: Todo[]): Todo[] =>
  todos.map((t) => ({ ...t, blockedBy: [...t.blockedBy] }));

const cleanText = (text: string): string | undefined => {
  const t = text.trim();
  return t.length === 0 ? undefined : t;
};

const textError = (): { ok: false; error: string } => ({
  ok: false,
  error: `text is limited to ${MAX_TEXT_LENGTH} characters`,
});

function add(state: TodoState, text: string): ActionResult {
  const t = cleanText(text);

  if (!t) return { ok: false, error: "text required for add" };
  if (t.length > MAX_TEXT_LENGTH) return textError();

  const todo: Todo = {
    text: t,
    blockedBy: [],
    id: state.nextId,
    status: "pending",
  };

  return {
    ok: true,
    text: `Added todo #${todo.id}: ${todo.text}`,
    state: { todos: [...state.todos, todo], nextId: state.nextId + 1 },
  };
}

function validateBlockedBy(
  todos: Todo[],
  id: number,
  blockedBy: number[],
): string | undefined {
  const seen = new Set<number>();

  for (const b of blockedBy) {
    if (b === id) return "task cannot block itself";

    if (!todos.some((t) => t.id === b)) {
      return `blockedBy references unknown todo #${b}`;
    }

    seen.add(b);
  }

  return undefined;
}

function update(state: TodoState, id: number, patch: Patch): ActionResult {
  if (
    patch.text === undefined &&
    patch.status === undefined &&
    patch.blockedBy === undefined
  ) {
    return { ok: false, error: "nothing to update" };
  }

  const target = state.todos.find((t) => t.id === id);
  if (!target) return { ok: false, error: `todo #${id} not found` };

  const next = clone(state.todos);
  const idx = next.findIndex((t) => t.id === id);

  if (patch.text !== undefined) {
    const t = cleanText(patch.text);

    if (!t) return { ok: false, error: "text cannot be empty" };
    if (t.length > MAX_TEXT_LENGTH) return textError();

    next[idx] = { ...next[idx], text: t };
  }

  if (patch.blockedBy !== undefined) {
    const err = validateBlockedBy(next, id, patch.blockedBy);
    if (err) return { ok: false, error: err };

    next[idx] = { ...next[idx], blockedBy: [...new Set(patch.blockedBy)] };
  }

  if (patch.status !== undefined) {
    next[idx] = { ...next[idx], status: patch.status };
  }

  if (wouldCreateCycle(next, id)) {
    return { ok: false, error: "would create a dependency cycle" };
  }

  return {
    ok: true,
    text: `Updated todo #${id}`,
    state: { todos: next, nextId: state.nextId },
  };
}

function remove(state: TodoState, id: number): ActionResult {
  if (!state.todos.some((t) => t.id === id)) {
    return { ok: false, error: `todo #${id} not found` };
  }

  const todos = state.todos
    .filter((t) => t.id !== id)
    .map((t) =>
      t.blockedBy.includes(id)
        ? { ...t, blockedBy: t.blockedBy.filter((b) => b !== id) }
        : t,
    );

  return {
    ok: true,
    text: `Removed todo #${id}`,
    state: { todos, nextId: state.nextId },
  };
}

const blockedSuffix = (t: Todo, todos: Todo[]): string => {
  const waiting = t.blockedBy.filter((b) => {
    const bt = todos.find((x) => x.id === b);

    return !bt || bt.status !== "completed";
  });

  if (waiting.length > 0) {
    return ` (blocked by ${waiting.map((b) => `#${b}`).join(", ")})`;
  }

  return "";
};

function list(state: TodoState): ActionResult {
  if (state.todos.length === 0) {
    return { ok: true, state, text: "No todos" };
  }

  return {
    state,
    ok: true,
    text: state.todos
      .map(
        (t) =>
          `[${t.status === "completed" ? "x" : " "}] #${t.id}: ${t.text}${blockedSuffix(t, state.todos)}`,
      )
      .join("\n"),
  };
}

function clear(): ActionResult {
  return {
    ok: true,
    text: "Cleared all todos",
    state: { todos: [], nextId: 1 },
  };
}

/**
 * Apply a tool action against a copy of the state.
 * Returns the new state only when validation passes; the caller commits it.
 */
export function applyAction(
  state: TodoState,
  params: {
    id?: number;
    text?: string;
    action: TodoAction;
    status?: TodoStatus;
    blockedBy?: number[];
  },
): ActionResult {
  switch (params.action) {
    case "add":
      return add(state, params.text ?? "");

    case "update":
      if (params.id === undefined) {
        return { ok: false, error: "id required for update" };
      }

      return update(state, params.id, params);

    case "remove":
      if (params.id === undefined) {
        return { ok: false, error: "id required for remove" };
      }

      return remove(state, params.id);

    case "list":
      return list(state);

    case "clear":
      return clear();
  }
}

/**
 * True if `changedId` can reach itself by following blockedBy edges
 * (direct, or through a chain) — i.e. the update would create a cycle.
 */
export function wouldCreateCycle(todos: Todo[], changedId: number): boolean {
  const adj = new Map<number, number[]>();
  for (const t of todos) adj.set(t.id, [...t.blockedBy]);

  const done = new Set<number>();
  const visiting = new Set<number>();

  const dfs = (id: number): boolean => {
    if (visiting.has(id)) return true;
    if (done.has(id)) return false;

    visiting.add(id);

    for (const dep of adj.get(id) ?? []) {
      if (dfs(dep)) return true;
    }

    visiting.delete(id);
    done.add(id);

    return false;
  };

  return dfs(changedId);
}

export function groupByStatus(todos: Todo[]): {
  completed: Todo[];
  inProgress: Todo[];
  pending: Todo[];
} {
  const completed: Todo[] = [];
  const inProgress: Todo[] = [];
  const pending: Todo[] = [];

  for (const t of todos) {
    if (t.status === "completed") completed.push(t);
    else if (t.status === "in-progress") inProgress.push(t);
    else pending.push(t);
  }

  return { completed, inProgress, pending };
}
