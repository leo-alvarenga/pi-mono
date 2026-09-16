import type { ExtensionContext } from "@earendil-works/pi-coding-agent";

export interface SessionBranchEntry {
  type: string;
  customType?: string;
  data?: unknown;
}

export interface SessionRecordStore<T> {
  getState(ctx: ExtensionContext): T;
  commit(ctx: ExtensionContext, next: T): void;
  replay(ctx: ExtensionContext): void;
  persistSnapshot(ctx: ExtensionContext): void;
}

/**
 * Generic session-scoped state store keyed by session id.
 * Consumer: pi-mini-subagents (via createSubagentRuntime), pi-todo-list (next).
 */
export function createSessionStore<T>(spec: {
  entryType: string;
  empty(): T;
  /** Transform a matching branch entry into state; return undefined to skip. */
  snapshotOf(entry: SessionBranchEntry): T | undefined;
  /** Extra replay source (e.g. tool result entries). Unused by subagents. */
  toolResultOf?(entry: SessionBranchEntry): T | undefined;
  /** Called after commit and after replay; use to persist and/or refresh UI. */
  onChange?(next: T, ctx: ExtensionContext): void;
}): SessionRecordStore<T> {
  const stateBySession = new Map<string, T>();

  function sid(ctx: ExtensionContext): string {
    return ctx.sessionManager.getSessionId();
  }

  function getState(ctx: ExtensionContext): T {
    const id = sid(ctx);
    let s = stateBySession.get(id);
    if (!s) stateBySession.set(id, (s = spec.empty()));
    return s;
  }

  function commit(ctx: ExtensionContext, next: T): void {
    stateBySession.set(sid(ctx), next);
    spec.onChange?.(next, ctx);
  }

  function replay(ctx: ExtensionContext): void {
    let latest: T = spec.empty();

    for (const entry of ctx.sessionManager.getBranch()) {
      if (entry.type === "custom" && entry.customType === spec.entryType) {
        const snapshot = spec.snapshotOf(entry);
        if (snapshot !== undefined) latest = snapshot;
      } else if (spec.toolResultOf) {
        const snapshot = spec.toolResultOf(entry);
        if (snapshot !== undefined) latest = snapshot;
      }
    }

    stateBySession.set(sid(ctx), latest);
    spec.onChange?.(latest, ctx);
  }

  function persistSnapshot(ctx: ExtensionContext): void {
    const s = getState(ctx);
    spec.onChange?.(s, ctx);
  }

  return { getState, commit, replay, persistSnapshot };
}
