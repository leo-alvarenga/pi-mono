import { MAX_TEXT_LENGTH } from "./constants";
import type { Todo, TodoAction, TodoState, TodoStatus } from "./types";
import { wouldCreateCycle } from "./query";

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

function clear(): ActionResult {
  return {
    ok: true,
    text: "Cleared all todos",
    state: { todos: [], nextId: 1 },
  };
}

function addMany(state: TodoState, texts: string[]): ActionResult {
  const cleaned = texts.map(cleanText);
  if (cleaned.some((t) => !t))
    return { ok: false, error: "text required for add" };
  if (cleaned.some((t) => t && t.length > MAX_TEXT_LENGTH)) return textError();

  let nextId = state.nextId;
  const added: Todo[] = cleaned.map((t) => ({
    text: t as string,
    blockedBy: [],
    id: nextId++,
    status: "pending",
  }));

  return {
    ok: true,
    text: `Added ${added.length} todos: ${added.map((t) => `#${t.id}`).join(", ")}`,
    state: { todos: [...state.todos, ...added], nextId },
  };
}

function removeMany(state: TodoState, ids: number[]): ActionResult {
  const missing = ids.filter((id) => !state.todos.some((t) => t.id === id));
  if (missing.length > 0) {
    return { ok: false, error: `todos not found: #${missing.join(", #")}` };
  }

  const gone = new Set(ids);
  const todos = state.todos
    .filter((t) => !gone.has(t.id))
    .map((t) => ({ ...t, blockedBy: t.blockedBy.filter((b) => !gone.has(b)) }));

  return {
    ok: true,
    text: `Removed ${ids.length} todos`,
    state: { todos, nextId: state.nextId },
  };
}

export function applyAction(
  state: TodoState,
  params: {
    id?: number;
    ids?: number[];
    text?: string;
    texts?: string[];
    action: TodoAction;
    status?: TodoStatus;
    blockedBy?: number[];
  },
): ActionResult {
  switch (params.action) {
    case "add":
      if (params.texts !== undefined && params.texts.length > 0)
        return addMany(state, params.texts);
      return add(state, params.text ?? "");

    case "update":
      if (params.id === undefined) {
        return { ok: false, error: "id required for update" };
      }

      return update(state, params.id, params);

    case "remove":
      if (params.ids !== undefined && params.ids.length > 0)
        return removeMany(state, params.ids);
      if (params.id === undefined) {
        return { ok: false, error: "id required for remove" };
      }

      return remove(state, params.id);

    case "list":
      return { ...list(state), ok: true, state };

    case "clear":
      return clear() as any;
  }
}

function list(state: TodoState): { text: string } {
  if (state.todos.length === 0) {
    return { text: "No todos" };
  }

  return {
    text: state.todos
      .map(
        (t) => `[${t.status === "completed" ? "x" : " "}] #${t.id}: ${t.text}`,
      )
      .join("\n"),
  };
}
