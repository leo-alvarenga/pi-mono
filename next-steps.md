# next-steps.md — pi-ext-core adoption opportunities

Ranked by value (lines deleted / risk). All items are **not done** — this is the backlog.

---

## 1. `pi-todo-list` — session store + panel widget (S, low risk, ~200 lines)

`src/state.ts` is a structural clone of the old `SubagentStore` with only `toolResultOf` replay differing.
`src/widget.ts` + `src/utils.ts` mirror the deleted subagent equivalents.

| File | Symbol | Replace with |
|------|--------|-------------|
| `packages/pi-todo-list/src/state.ts` | `TodoStore` / `createTodoStore` | `createSessionStore<TodoState>` |
| `packages/pi-todo-list/src/widget.ts` | `createTodoWidget` | `createPanelWidget<TodoState>` |
| `packages/pi-todo-list/src/utils.ts` | `getStyledTodo`, `getHeader` | keep as `rowLine` callback; delete the rest |

Effort: S. Risk: low — same pattern already proven in pi-mini-subagents refactor.

---

## 2. `pi-todo-list` — type + constant dedup (S, low risk, ~5 lines)

| File | Symbol | Replace with |
|------|--------|-------------|
| `packages/pi-todo-list/src/constants.ts:31` | `PANEL_STATE_ICON` | `PANEL_STATE_ICON` from lib |
| `packages/pi-todo-list/src/types.ts:6` | `TodoStatusUi` | `StatusUi` from lib |

Do alongside item 1 — same PR.

---

## 3. `pi-agent-manager` — `capitalize` (XS, trivial)

| File | Symbol | Replace with |
|------|--------|-------------|
| `packages/pi-agent-manager/src/cli/help.ts:5` | local `capitalize` | `capitalize` from lib |

One import swap, no logic change.

---

## 4. `pi-zen-frame` — `capitalize` + `TokenUsage` (XS, trivial)

| File | Symbol | Replace with |
|------|--------|-------------|
| `extensions/utils/string.ts:4` | local `capitalize` | `capitalize` from lib |
| `utils/index.ts` | re-export of local `capitalize` | re-export from lib |
| `extensions/utils/token.ts:9` | `TokenThroughput` | `TokenUsage` from lib (rename at callsites) |

---

## 5. `pi-notify` — `formatDuration` (XS, trivial)

| File | Symbol | Replace with |
|------|--------|-------------|
| `packages/pi-notify/src/tracker.ts` | local `formatDuration` | `formatDuration` from lib |

Note: the notify-send/D-Bus abstraction has one consumer today — do not extract (YAGNI).

---

## 6. `pi-status-broadcaster` — future file-state helper (L, future, medium risk)

No current overlap. The single shared `/tmp/pi-status-broadcaster/status.json` has a known
lost-update risk under concurrent sessions and silently swallows write failures. If that is ever
fixed, `createSessionStore` could grow a file-backend variant. Preserve `SessionEntry` /
`FinishedEntry` / `ReportSchema` shapes and `generateName()` in any future design.

Not worth touching until the concurrency bug is reported in production.

---

## 7. Near-misses — leave alone

| Symbol | Where | Why not merge |
|--------|-------|---------------|
| `AgentConfig` / `AgentState` | `pi-agent-manager`, `pi-zen-frame` | Different shapes, coincidental names |
| `MAX_PANEL_ROWS = 8` | `pi-todo-list`, `pi-mini-subagents` | Coincidental value, independent semantics |

---

## 8. `pi-hash-edit` — no overlap

Explicitly audited: no symbols in `pi-hash-edit` duplicate anything in `pi-ext-core`. Closed.

---

*Lifecycle: promote items to issues or delete this file once done.*
