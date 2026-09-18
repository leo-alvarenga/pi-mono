import type { ExtensionContext } from "@earendil-works/pi-coding-agent";

import {
  createSessionStore,
  type SessionRecordStore,
} from "@leo-alvarenga/pi-ext-core";

import { STATE_ENTRY } from "./constants";
import type { TodoState } from "./types";

/** Session-scoped todo state, committed to the `todos.state` custom entry. */
export function createTodoStore(
  persist: (snapshot: TodoState) => void,
  onRefresh?: (ctx: ExtensionContext) => void,
): SessionRecordStore<TodoState> {
  return createSessionStore<TodoState>({
    empty: () => ({ todos: [], nextId: 1 }),
    entryType: STATE_ENTRY,
    snapshotOf: (entry) => entry.data as TodoState | undefined,
    onChange: (state, ctx) => {
      persist(state);
      onRefresh?.(ctx);
    },
  });
}
