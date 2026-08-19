import type { ExtensionContext } from "@earendil-works/pi-coding-agent";

import { STATE_ENTRY } from "./constants";
import type { TodoDetails, TodoState } from "./types";

/**
 * Session-scoped todo state.
 *
 * State is keyed by the active session id so forked/parallel sessions never
 * overwrite each other, and it is replayed from the session branch on every
 * session event, so it survives /reload and compaction without the extension
 * writing any of its own files.
 */
export class TodoStore {
  private readonly stateBySession = new Map<string, TodoState>();

  constructor(
    private readonly persist: (snapshot: TodoState) => void,
    private readonly emitChange: (ctx: ExtensionContext) => void,
  ) {}

  private sid(ctx: ExtensionContext): string {
    return ctx.sessionManager.getSessionId();
  }

  getState(ctx: ExtensionContext): TodoState {
    const sid = this.sid(ctx);

    let s = this.stateBySession.get(sid);
    if (!s) this.stateBySession.set(sid, (s = { todos: [], nextId: 1 }));

    return s;
  }

  /** Commit a validated snapshot: update memory, persist, refresh the panel. */
  commit(ctx: ExtensionContext, next: TodoState): void {
    this.stateBySession.set(this.sid(ctx), next);
    this.persist(next);
    this.emitChange(ctx);
  }

  /** Rebuild the current session's state from the session branch (no disk writes). */
  replay(ctx: ExtensionContext): void {
    const s = this.getState(ctx);
    s.todos = [];
    s.nextId = 1;

    for (const entry of ctx.sessionManager.getBranch()) {
      if (entry.type === "custom" && entry.customType === STATE_ENTRY) {
        const d = entry.data as TodoState | undefined;

        if (d) {
          s.todos = d.todos;
          s.nextId = d.nextId;
        }

        continue;
      }

      if (
        entry.type === "message" &&
        entry.message.role === "toolResult" &&
        entry.message.toolName === "todo"
      ) {
        const d = entry.message.details as TodoDetails | undefined;

        if (d && !d.error) {
          s.todos = d.todos;
          s.nextId = d.nextId;
        }
      }
    }

    this.emitChange(ctx);
  }

  /** Persist the latest snapshot right before compaction so it lands after the cut point. */
  persistSnapshot(ctx: ExtensionContext): void {
    const s = this.getState(ctx);
    if (s.todos.length > 0) this.persist(s);
  }
}
