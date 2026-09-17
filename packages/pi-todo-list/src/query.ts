import type { Todo, TodoState } from "./types";

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

export function list(state: TodoState): { text: string } {
  if (state.todos.length === 0) {
    return { text: "No todos" };
  }

  return {
    text: state.todos
      .map(
        (t) =>
          `[${t.status === "completed" ? "x" : " "}] #${t.id}: ${t.text}${blockedSuffix(t, state.todos)}`,
      )
      .join("\n"),
  };
}

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
