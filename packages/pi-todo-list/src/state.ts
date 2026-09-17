import type { ExtensionContext } from "@earendil-works/pi-coding-agent";

import { createSessionStore, SessionRecordStore } from "@leo-alvarenga/pi-ext-core";

import { STATE_ENTRY } from "./constants";
import type { TodoDetails, TodoState } from "./types";

export class TodoStore {
  private store: SessionRecordStore<TodoState>;

  constructor(
    private readonly persist: (snapshot: TodoState) => void,
    private readonly onRefresh?: (ctx: ExtensionContext) => void,
  ) {
    this.store = createSessionStore<TodoState>({
      empty: () => ({ todos: [], nextId: 1 }),
      entryType: STATE_ENTRY,
      snapshotOf: (entry) => {
        if (entry.type === "custom" && entry.customType === STATE_ENTRY) {
          return entry.data as TodoState | undefined;
        }
      },
      toolResultOf: (entry) => {
        if (
          entry.type === "message" &&
          entry.message.role === "toolResult" &&
          entry.message.toolName === "todo"
        ) {
          const d = entry.message.details as TodoDetails | undefined;
          if (d && !d.error) return { todos: d.todos, nextId: d.nextId };
        }
      },
      onChange: (state, ctx) => {
        this.persist(state);
        this.onRefresh?.(ctx);
      },
    });
  }

  getState(ctx: ExtensionContext): TodoState {
    return this.store.getState(ctx);
  }

  commit(ctx: ExtensionContext, state: TodoState): void {
    this.store.commit(ctx, state);
  }

  replay(ctx: ExtensionContext): void {
    this.store.replay(ctx);
  }

  persistSnapshot(ctx: ExtensionContext): void {
    this.store.persistSnapshot(ctx);
  }
}
