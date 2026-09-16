import assert from "node:assert/strict";

import { createSessionStore, type SessionBranchEntry } from "./store";

type S = { items: string[]; nextId: number };

function makeCtx(sessionId: string, branch: SessionBranchEntry[] = []) {
  return {
    sessionManager: {
      getSessionId: () => sessionId,
      getBranch: () => branch,
    },
    hasUI: false,
    ui: { setWidget: () => {}, notify: () => {} },
  } as any;
}

const ENTRY_TYPE = "test.state";

function makeStore(onChange?: (s: S, ctx: any) => void) {
  return createSessionStore<S>({
    entryType: ENTRY_TYPE,
    empty: () => ({ items: [], nextId: 1 }),
    snapshotOf: (e) => (e.data as S | undefined) ?? undefined,
    onChange,
  });
}

// getState returns empty for new session
{
  const store = makeStore();
  const ctx = makeCtx("s1");
  const s = store.getState(ctx);
  assert.deepEqual(s, { items: [], nextId: 1 });
}

// commit updates state and calls onChange
{
  const changes: S[] = [];
  const store = makeStore((s) => changes.push(s));
  const ctx = makeCtx("s1");
  store.commit(ctx, { items: ["a"], nextId: 2 });
  assert.deepEqual(store.getState(ctx), { items: ["a"], nextId: 2 });
  assert.equal(changes.length, 1);
  assert.deepEqual(changes[0], { items: ["a"], nextId: 2 });
}

// separate sessions are isolated
{
  const store = makeStore();
  const ctx1 = makeCtx("s1");
  const ctx2 = makeCtx("s2");
  store.commit(ctx1, { items: ["a"], nextId: 2 });
  const s2 = store.getState(ctx2);
  assert.deepEqual(s2, { items: [], nextId: 1 });
}

// replay rebuilds from branch, takes last matching entry, and calls onChange
{
  const changes: S[] = [];
  const branch: SessionBranchEntry[] = [
    { type: "custom", customType: ENTRY_TYPE, data: { items: ["first"], nextId: 2 } },
    { type: "custom", customType: ENTRY_TYPE, data: { items: ["first", "second"], nextId: 3 } },
    { type: "custom", customType: "other.type", data: { items: ["ignored"], nextId: 99 } },
  ];
  const store = makeStore((s) => changes.push({ ...s }));
  const ctx = makeCtx("s1", branch);
  store.replay(ctx);
  assert.deepEqual(store.getState(ctx), { items: ["first", "second"], nextId: 3 });
  assert.equal(changes.length, 1);
}

// replay with no matching entries → empty state
{
  const store = makeStore();
  const branch: SessionBranchEntry[] = [
    { type: "message", customType: undefined },
  ];
  const ctx = makeCtx("s1", branch);
  store.replay(ctx);
  assert.deepEqual(store.getState(ctx), { items: [], nextId: 1 });
}

// persistSnapshot calls onChange
{
  const changes: S[] = [];
  const store = makeStore((s) => changes.push({ ...s }));
  const ctx = makeCtx("s1");
  store.commit(ctx, { items: ["x"], nextId: 2 });
  changes.length = 0;
  store.persistSnapshot(ctx);
  assert.equal(changes.length, 1);
}

console.log("pi-ext-core session/store OK");
