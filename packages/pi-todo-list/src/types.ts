import { ThemeColor } from "@earendil-works/pi-coding-agent";
import { STATUSES } from "./constants";

export type TodoStatus = (typeof STATUSES)[number];

export type TodoStatusUi = {
  icon: string;
  fg: ThemeColor;
  bold?: boolean;
  color: ThemeColor;
  strikethrough?: boolean;
};

export interface Todo {
  id: number;
  text: string;
  status: TodoStatus;
  /** Ids of tasks this task depends on. */
  blockedBy: number[];
}

export interface TodoState {
  todos: Todo[];
  nextId: number;
}

export type TodoAction = "add" | "update" | "remove" | "list" | "clear";

/** Shape stored in tool-result details and the todos.state custom entry. */
export interface TodoDetails {
  action: TodoAction;
  todos: Todo[];
  nextId: number;
  error?: string;
}
