import type { ExtensionContext } from "@earendil-works/pi-coding-agent";

import { STATE_ENTRY } from "./constants";
import type { SubagentRecord, SubagentState } from "./types";

/**
 * Session-scoped subagent state.
 *
 * Keyed by session id so forked/parallel sessions never overwrite each other,
 * and replayed from the session branch on session events so it survives
 * /reload and compaction without the extension writing its own files.
 * Running records are dropped on replay — their processes do not survive a reload.
 */
export class SubagentStore {
  private readonly stateBySession = new Map<string, SubagentState>();

  constructor(
    private readonly persist: (snapshot: SubagentState) => void,
    private readonly emitChange: (ctx: ExtensionContext) => void,
  ) {}

  private sid(ctx: ExtensionContext): string {
    return ctx.sessionManager.getSessionId();
  }

  getState(ctx: ExtensionContext): SubagentState {
    const sid = this.sid(ctx);
    let s = this.stateBySession.get(sid);
    if (!s) this.stateBySession.set(sid, (s = { records: [], nextId: 1 }));
    return s;
  }

  /** Commit a snapshot: update memory, persist, refresh the panel. */
  commit(ctx: ExtensionContext, next: SubagentState): void {
    this.stateBySession.set(this.sid(ctx), next);
    this.persist(next);
    this.emitChange(ctx);
  }

  /** Create a `running` record and commit it. */
  start(
    ctx: ExtensionContext,
    task: string,
    allowWrite: boolean,
    cwd?: string,
  ): SubagentRecord {
    const s = this.getState(ctx);
    const record: SubagentRecord = {
      id: s.nextId,
      task,
      status: "running",
      allowWrite,
      cwd,
      startedAt: Date.now(),
    };
    this.commit(ctx, { records: [...s.records, record], nextId: s.nextId + 1 });
    return record;
  }

  /** Patch an existing record in place and commit. */
  finish(
    ctx: ExtensionContext,
    id: number,
    patch: Partial<SubagentRecord>,
  ): void {
    const s = this.getState(ctx);
    this.commit(ctx, {
      records: s.records.map((r) => (r.id === id ? { ...r, ...patch } : r)),
      nextId: s.nextId,
    });
  }

  /** Rebuild the current session's state from the branch (no disk writes). */
  replay(ctx: ExtensionContext): void {
    const s = this.getState(ctx);
    s.records = [];
    s.nextId = 1;

    for (const entry of ctx.sessionManager.getBranch()) {
      if (entry.type === "custom" && entry.customType === STATE_ENTRY) {
        const d = entry.data as SubagentState | undefined;
        if (d) {
          s.records = d.records.filter((r) => r.status !== "running");
          s.nextId = d.nextId;
        }
      }
    }

    this.emitChange(ctx);
  }

  /** Persist the latest snapshot right before compaction so it lands after the cut point. */
  persistSnapshot(ctx: ExtensionContext): void {
    const s = this.getState(ctx);
    if (s.records.length > 0) this.persist(s);
  }
}
