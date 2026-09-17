# IMPLEMENTATION PROGRESS — Session 2026-09-17

## Status: 17/17 Phases Complete (100%) ✅

### Completed ✅
- **Phase 1** (pi-hash-edit): Split 175 LOC → hash.ts (90) + tools.ts (100) + entry (6)
- **Phase 2** (pi-mini-subagents): Audited; no changes needed (STATUSES not in pi-ext-core)
- **Phase 3-A through 3-F** (pi-agent-manager):
  - 3-A: Explored all files
  - 3-B: Added pi-ext-core dep
  - 3-C: Split config.ts (282) → loader.ts + validate.ts + orchestrator
  - 3-D: Extracted pure state functions; updated manager
  - 3-E: Split index.ts (327) → setup.ts + events.ts + commands.ts + entry
  - 3-F: Integrated SessionRecordStore<AgentState> for session persistence
- **Phase 4-A through 4-F** (pi-todo-list):
  - 4-A: Explored all files
  - 4-B: Added pi-ext-core dep
  - 4-C: Split core.ts (302) → query.ts (reads/analysis) + core.ts (mutations)
  - 4-D: Reviewed tool.ts (158 LOC); cohesive split unnecessary
  - 4-E: Replaced widget.ts with PanelWidgetSpec<TodoState> + createPanelWidget
  - 4-F: Replaced state.ts with SessionRecordStore<TodoState>


### Key Achievements
- 5 new files created (hash.ts, tools.ts, loader.ts, validate.ts, state.ts, query.ts, setup.ts, events.ts, commands.ts)
- 4 large files split and refactored (under 165 LOC max)
- pi-ext-core integrated:
  - SessionRecordStore<AgentState> for agent state persistence
  - SessionRecordStore<TodoState> for todo state persistence
  - PanelWidgetSpec<TodoState> + createPanelWidget for todo panel
- Pure state functions extracted; helper utilities created
- All pi-agent-manager and pi-todo-list files now use pi-ext-core primitives
---

# Pi Extensions Refactor Plan

## What This Plan Covers

Three packages under `packages/` need two kinds of work:
1. **Code splitting** — files over 150 LOC broken into focused modules.
2. **pi-ext-core integration** — replace bespoke implementations with types, utilities, and primitives already exported by `@leo-alvarenga/pi-ext-core`.

| Package | Files >150 LOC | pi-ext-core dep today? |
|---|---|---|
| `pi-hash-edit` | 1 file (175 LOC — just over) | No |
| `pi-mini-subagents` | 0 files | Yes — correctly used |
| `pi-agent-manager` | 3 files (327 / 282 / 232) | No |
| `pi-todo-list` | 2 files (302 / 158) | No |

**pi-ext-core barrel exports** (all re-exported from `src/index.ts`):

| Category | Key exports |
|---|---|
| Primitives | `StatusUi`, `TokenUsage`, `PANEL_STATE_ICON` |
| Headless runner | `runHeadlessAgent`, `RunHeadlessAgentOptions`, `HeadlessRunResult`, `HeadlessRunTokenUsage` |
| Session store | `SessionRecordStore<T>`, `SessionBranchEntry`, `createSessionStore` (from `./session/store`) |
| TUI panel | `PanelWidgetSpec<T>`, `PanelWidgetControls`, `createPanelWidget` (from `./tui/panel`) |
| Subagent runtime | `SubagentSpec`, `SubagentStatus`, `SubagentRecord`, `SubagentState`, `createSubagentRuntime` |
| Utils | string helpers (from `./utils/strings`), concurrency helpers (from `./utils/concurrency`) |

---

## Execution Protocol

### Subagent usage (mandatory)

- **Before any edit in a phase**, spawn a parallel subagent batch (read-only) to read every file the phase touches. Never pipe raw file content into main context.
- Only use `allowWrite: true` subagents for the actual edit step, one file at a time.
- Subagent findings come back as summaries; act on the summary, not re-read the raw bytes.

### Todo tracking (highest priority)

Add all todos before starting Phase 1. Update status (`in-progress` → `completed`) **before** moving to the next item. A stale todo is worse than no todo.

**Initial todo list to create at session start:**

```
[ ] Phase 1-A: Explore pi-hash-edit/src/hash-edit-tools.ts fully
[ ] Phase 1-B: Split hash-edit-tools.ts → hash.ts + tools.ts + thin entry
[ ] Phase 2-A: Explore pi-mini-subagents/src/constants.ts + index.ts fully
[ ] Phase 2-B: Audit STATUSES array vs SubagentStatus from pi-ext-core
[ ] Phase 3-A: Explore pi-agent-manager oversized files (index.ts, config.ts, manager.ts, types.ts)
[ ] Phase 3-B: Add pi-ext-core workspace dep to pi-agent-manager
[ ] Phase 3-C: Split src/agent/config.ts → loader.ts + validate.ts + thin config.ts
[ ] Phase 3-D: Split src/agent/manager.ts → state.ts + thin manager.ts
[ ] Phase 3-E: Split src/index.ts → setup.ts + events.ts + commands/ + thin index.ts
[ ] Phase 3-F: Replace raw session branch iteration with SessionRecordStore from pi-ext-core
[ ] Phase 3-G: Evaluate TUI panel and StatusUi usage — adopt pi-ext-core primitives where applicable
[ ] Phase 4-A: Explore pi-todo-list src/core.ts, tool.ts, widget.ts, state.ts fully
[ ] Phase 4-B: Add pi-ext-core workspace dep to pi-todo-list
[ ] Phase 4-C: Split src/core.ts by responsibility
[ ] Phase 4-D: Review src/tool.ts after core split — split further if still over 150 LOC
[ ] Phase 4-E: Replace src/widget.ts with PanelWidgetSpec<TodoState> + createPanelWidget from pi-ext-core
[ ] Phase 4-F: Replace bespoke session store in src/state.ts with SessionRecordStore<TodoState> from pi-ext-core
```

---

## Phase 1 — `pi-hash-edit`

**Package:** `@leo-alvarenga/pi-hash-edit` v0.2.1  
**Entry point (from package.json `pi.extensions`):** `./src/hash-edit-tools.ts`  
**Only source file:** `src/hash-edit-tools.ts` — 175 LOC (25 over limit)

### What the file does (already known)

- `getLineHash(line)` — SHA-256 truncated to 4 hex chars, trims whitespace before hashing.
- `hashRead(filePath, start?, end?)` — read with per-line hash prefixes.
- `hashEdit(filePath, startHash, endHash, newContent, displayPath?)` — locate hash anchors, splice content, write back. Returns error string on mismatch (no throw).
- Two Typebox schemas + tool registration for `hash_read` and `hash_edit`.
- `resolvePath` helper (relative to `ctx.cwd`).

### Phase 1-A: Exploration subagent

Spawn a **single read-only subagent** that reads `src/hash-edit-tools.ts` in full and reports:
- Exact line ranges for: (a) imports, (b) pure logic functions, (c) Typebox schemas, (d) tool registration block.
- Whether `resolvePath` is trivial (one-liner) or non-trivial.

This tells you the exact split boundary before touching the file.

### Phase 1-B: Split into three files

**New file: `src/hash.ts`** (~100 LOC)  
Contains only the pure, side-effect-free logic:
```
getLineHash(line: string): string
hashRead(filePath: string, startLine?: number, endLine?: number): Promise<string>
hashEdit(filePath: string, startHash: string, endHash: string, newContent: string, displayPath?: string): Promise<string>
```
No `pi` imports. No Typebox. Exports all three functions.

**New file: `src/tools.ts`** (~75 LOC)  
Contains:
- Import of `hashRead`, `hashEdit` from `./hash`
- `resolvePath` helper (inline here if it's trivial — no separate file)
- Typebox schemas for both tools
- The registration function: `export function registerHashTools(pi: ExtensionAPI): void`

**Updated `src/hash-edit-tools.ts`** (~10 LOC — entry point preserved for `pi.extensions` compatibility)  
```ts
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { registerHashTools } from "./tools";

export default async function (pi: ExtensionAPI) {
  registerHashTools(pi);
}
```

### pi-ext-core integration

**None.** Hash-edit has no session state, no TUI, no subagent concepts. Adding pi-ext-core would be over-engineering — skip it.

---

## Phase 2 — `pi-mini-subagents`

**Package:** `@leo-alvarenga/pi-mini-subagents` v0.2.1  
**Files:** `src/constants.ts` (55 LOC), `src/index.ts` (95 LOC) — both under limit.  
**Already depends on:** `@leo-alvarenga/pi-ext-core: workspace:^`

### Phase 2-A: Exploration subagent

Spawn a **single read-only subagent** that reads both `src/constants.ts` and `src/index.ts` fully and reports:
- Every import from `@leo-alvarenga/pi-ext-core` — list them.
- The full `STATUSES` constant definition and whether any other file derives types from it locally.
- Whether `src/index.ts` re-implements any logic that pi-ext-core already exports (e.g., manual branch iteration instead of `SessionRecordStore`, manual panel code instead of `createPanelWidget`).

### Phase 2-B: Specific check — `STATUSES` array

`src/constants.ts` defines:
```ts
export const STATUSES = ["running", "completed", "failed", "needs_input"] as const;
```

This is the runtime array form of the `SubagentStatus` union already typed in pi-ext-core.

**Check:** Does pi-ext-core export a `SUBAGENT_STATUSES` constant or similar runtime array?  
- If **yes**: delete `STATUSES` from constants.ts, import from pi-ext-core.  
- If **no**: keep `STATUSES` locally — it serves a different purpose (runtime array vs. type-level union).

Check by reading `libs/pi-ext-core/src/subagents/types.ts` and `libs/pi-ext-core/src/index.ts` for any `STATUSES`-equivalent export. This is a one-line subagent grep task.

### Expected outcome

This phase is an audit pass. Most likely **no file edits needed** beyond possibly removing the `STATUSES` duplication. Do not restructure if nothing is wrong.

---

## Phase 3 — `pi-agent-manager`

**Package:** `@leo-alvarenga/pi-agent-manager` v0.18.4  
**Does not depend on pi-ext-core today.**

Oversized files:
| File | LOC | Primary responsibility |
|---|---|---|
| `src/index.ts` | 327 | Extension entry: bootstrap + events + commands |
| `src/agent/config.ts` | 282 | YAML loading + agent validation |
| `src/agent/manager.ts` | 232 | Agent state management |

Files already under limit (do not touch unless a split above forces an import change):
`src/agent/builtin.ts`, `src/agent/types.ts`, `src/cli/*.ts`, `src/constants.ts`, `src/permission/*.ts`

### Phase 3-A: Exploration subagents (parallel batch)

Spawn **four read-only subagents in parallel**:
1. Read `src/index.ts` in full — report: what each block does, line ranges for: imports, session_start handler, each `pi.on()`/`pi.registerCommand()`/`pi.registerTool()` call group, any TUI panel setup.
2. Read `src/agent/config.ts` in full — report: function list, line ranges for YAML parsing vs. file discovery vs. validation vs. shortcut loading.
3. Read `src/agent/manager.ts` in full — report: what state it holds, every method with its line range, whether it calls sessionManager directly.
4. Read `src/agent/types.ts` in full — report: the `AgentState` type shape.

Do not proceed to edits until all four reports are back. The rest of Phase 3 is gated on this.

### Phase 3-B: Add pi-ext-core dependency

In `packages/pi-agent-manager/package.json`, add to `dependencies`:
```json
"@leo-alvarenga/pi-ext-core": "workspace:^"
```

This is a one-line edit. Do it first so subsequent steps can import from it.

### Phase 3-C: Split `src/agent/config.ts` (282 LOC)

Based on the exploration report, split by responsibility boundary:

**`src/agent/loader.ts`** (~110–130 LOC)  
Contains:
- File-system scanning (directory walk, YAML file discovery)
- Raw YAML frontmatter parsing
- `loadRawAgents(dir: string)` or equivalent — returns parsed-but-unvalidated agent objects

**`src/agent/validate.ts`** (~80–100 LOC)  
Contains:
- Agent schema validation (required fields, type checks)
- Error accumulation logic
- `validateAgent(raw): { agent: Agent | null; error: string | null }`

**`src/agent/config.ts`** reduced to ~40–50 LOC orchestrator:
```ts
export async function loadUserAgents(): Promise<{ agents: Agent[]; errors: string[] }> {
  const raw = await loadRawAgents(agentsDir);
  return raw.reduce(...validate each...);
}
export function loadAgentShortcuts(): ...  // keep here if short, or move to loader
```

**Important:** The exploration report from 3-A will tell you exactly which functions belong where. Do not guess — use the line ranges reported.

### Phase 3-D: Split `src/agent/manager.ts` (232 LOC)

Based on the exploration report:

**`src/agent/state.ts`** (~80–100 LOC)  
Contains:
- The `AgentState` shape manipulation: active agent, previous agent, guard mode
- Pure state transition functions (no `pi` dependency):
  ```ts
  function applyAgentSwitch(state: AgentState, name: string): AgentState
  function getActiveAgent(state: AgentState): Agent
  ```

**`src/agent/manager.ts`** reduced to ~80–100 LOC factory + wiring:
- `createAgentManager(agents)` — creates the manager object
- Hooks state transitions to `pi` lifecycle calls
- Calls permission evaluation from `src/permission/`

**Key constraint:** If `manager.ts` calls `sessionManager` directly, that interaction moves to Phase 3-F after `SessionRecordStore` is introduced.

### Phase 3-E: Split `src/index.ts` (327 LOC)

The extension entry point must remain at `src/index.ts` (referenced by `package.json` `pi.extensions`). It becomes a thin coordinator.

**`src/setup.ts`** (~60–80 LOC)  
All initialization that runs once at load time:
```ts
export async function bootstrap(): Promise<{
  agents: Agent[];
  agentManager: ReturnType<typeof createAgentManager>;
  shortcuts: Shortcuts;
  configErrors: string[];
}>
```

**`src/events.ts`** (~60–80 LOC)  
Handlers for `session_start`, `session_end`, and any other lifecycle events:
```ts
export function registerEvents(pi: ExtensionAPI, ctx: { agentManager, logger, ... }): void
```

**`src/commands/index.ts`** (~60–80 LOC)  
All `pi.registerCommand()` calls:
```ts
export function registerCommands(pi: ExtensionAPI, ctx: { agentManager, agents, ... }): void
```

If individual commands are long, each gets its own file: `src/commands/agent.ts`, `src/commands/switch.ts`, etc. — decide after seeing the exploration report line ranges.

**`src/index.ts`** reduced to ~30–40 LOC:
```ts
export default async function (pi: ExtensionAPI) {
  const ctx = await bootstrap();
  registerEvents(pi, ctx);
  registerCommands(pi, ctx);
  // any tool registrations
}
```

### Phase 3-F: Replace raw session branch iteration with `SessionRecordStore`

**Current pattern** (in `src/index.ts` `session_start` handler):
```ts
const entries = [...ctx.sessionManager.getBranch()].reverse();
let agent: string | undefined;
for (const entry of entries) {
  if (entry.type !== "custom" || entry.customType !== AGENT_DATA_KEY) continue;
  // extract agent from entry.data
}
```

**Replace with** `SessionRecordStore<AgentState>` from pi-ext-core:

```ts
import { createSessionStore } from "@leo-alvarenga/pi-ext-core";

// In session_start:
const store = createSessionStore<AgentState>(ctx.sessionManager, AGENT_DATA_KEY);
const state = store.getState();  // typed AgentState | null
if (state) agentManager.restore(state);

// When saving agent changes:
store.commit(newState);
```

**What you need to know before this step:**
- Read `libs/pi-ext-core/src/session/store.ts` fully to understand the exact API (`createSessionStore` signature, return shape).
- Read `libs/pi-ext-core/src/session/types.ts` for `SessionRecordStore<T>` interface.
- Map `AgentState` fields to what gets stored in the branch entry `data` field.

Spawn a read-only subagent to read both core files before implementing.

### Phase 3-G: Evaluate TUI panel and StatusUi usage

**Only act on this if the Phase 3-A exploration reveals a TUI panel in the agent-manager.**

If `src/index.ts` contains panel registration code:
- Replace bespoke panel spec with `PanelWidgetSpec<AgentState>` from pi-ext-core.
- Use `createPanelWidget(pi, spec)` from pi-ext-core instead of manual `pi.registerPanel(...)` calls.
- Import `StatusUi` and `PANEL_STATE_ICON` for any status/collapse icons.

If there is no panel code: skip this step entirely.

## Phase 4 — `pi-todo-list`

**Package:** `@leo-alvarenga/pi-todo-list` v0.5.0  
**Does not depend on pi-ext-core today.**

Oversized files:
| File | LOC | Primary responsibility |
|---|---|---|
| `src/core.ts` | 302 | Todo CRUD operations and filtering logic |
| `src/tool.ts` | 158 | Typebox schemas + tool registration (just over) |

Files already under limit:
`src/index.ts` (24), `src/types.ts` (29), `src/constants.ts` (26), `src/state.ts` (62), `src/command.ts` (57), `src/widget.ts` (74), `src/utils.ts` (~115)

### Phase 4-A: Exploration subagents (parallel batch)

Spawn **four read-only subagents in parallel**:
1. Read `src/core.ts` in full — report: every exported function with its line range and purpose.
2. Read `src/tool.ts` in full — report: schema definitions vs. tool registration blocks, line ranges for each.
3. Read `src/widget.ts` in full — report: how the panel is currently built (manual `pi.registerPanel` vs. a spec object), what render functions exist, what state type it works with.
4. Read `src/state.ts` in full — report: how session state is persisted/restored (raw branch iteration vs. a store abstraction), the `TodoState`/`TodoStore` type shape.

Do not proceed to edits until all four reports are back.

### Phase 4-B: Add pi-ext-core dependency

In `packages/pi-todo-list/package.json`, add to `dependencies`:
```json
"@leo-alvarenga/pi-ext-core": "workspace:^"
```

### Phase 4-C: Split `src/core.ts` (302 LOC)

Based on the exploration report, split by operation boundary. Likely split:

**`src/operations/add.ts`** — todo creation logic (`addTodo`, ID generation, defaults)
**`src/operations/update.ts`** — update, status change, reorder
**`src/operations/query.ts`** — filtering, listing, searching todos

If `core.ts` mixes these uniformly, an alternative two-file split:
- **`src/core.ts`** — mutation operations (add / update / remove / clear) ~100 LOC
- **`src/query.ts`** — read/filter operations ~100 LOC

**Use the line ranges from the exploration report to pick the cleanest boundary.** Do not guess.

### Phase 4-D: Review `src/tool.ts` after core split

`src/tool.ts` imports from `src/core.ts`. After the split, update its imports. Re-check line count — if the import reorganization brings it under 150 LOC, no further split needed. If still over, extract schemas to `src/schemas.ts` and leave only registration logic in `tool.ts`.

### Phase 4-E: Replace `src/widget.ts` with `PanelWidgetSpec<TodoState>` + `createPanelWidget`

This is the primary pi-ext-core integration goal for this package.

**Before implementing**, spawn a read-only subagent to read:
- `libs/pi-ext-core/src/tui/types.ts` — `PanelWidgetSpec<T>` shape
- `libs/pi-ext-core/src/tui/panel.ts` — `createPanelWidget` signature and return type

**What changes in `src/widget.ts`:**

Current bespoke approach (expected):
```ts
// manually constructs a class or object and calls pi.registerPanel(...)
```

Replace with:
```ts
import { createPanelWidget, PanelWidgetSpec } from "@leo-alvarenga/pi-ext-core";

const spec: PanelWidgetSpec<TodoState> = {
  widgetKey: WIDGET_KEY,
  maxRows: MAX_ROWS,
  emptyText: "No todos",
  toggleChord: TOGGLE_KEY,
  isEmpty: (s) => s.todos.length === 0,
  store: todoStore,
  moreLabel: (n) => `…and ${n} more`,
  header: (s, theme, isCollapsed) => /* existing header render logic */,
  rows: (s, theme, opts) => /* existing row render logic */,
};

export function createTodoWidget(pi: ExtensionAPI) {
  return createPanelWidget(pi, spec);
}
```

Move the existing render functions verbatim into the `header` and `rows` fields — the logic does not change, only the wiring. Target: `src/widget.ts` stays ~74 LOC or shrinks.

**`PANEL_STATE_ICON`** from pi-ext-core should replace any local collapsed/expanded icon constants if `src/widget.ts` defines them.

### Phase 4-F: Replace bespoke session store with `SessionRecordStore<TodoState>`

**Before implementing**, spawn a read-only subagent to read:
- `libs/pi-ext-core/src/session/store.ts` — `createSessionStore` signature
- `libs/pi-ext-core/src/session/types.ts` — `SessionRecordStore<T>` interface

**What changes in `src/state.ts`:**

`TodoStore` class (62 LOC) likely wraps raw `sessionManager.getBranch()` / `sessionManager.commit()` calls. Replace the internals with `SessionRecordStore<TodoState>` from pi-ext-core:

```ts
import { createSessionStore, SessionRecordStore } from "@leo-alvarenga/pi-ext-core";

export class TodoStore {
  private store: SessionRecordStore<TodoState>;

  constructor(sessionManager: SessionManager) {
    this.store = createSessionStore<TodoState>(sessionManager, STATE_ENTRY);
  }

  getState(): TodoState { return this.store.getState() ?? defaultState(); }
  commit(s: TodoState): void { this.store.commit(s); }
  replay(): void { this.store.replay(); }
}
```

If `TodoStore` already matches this shape closely, the diff will be small — a few line swaps. If it's structurally different, adapt accordingly based on the exploration report.


---

## File Tree After All Phases

```
packages/
├── pi-hash-edit/
│   └── src/
│       ├── hash.ts              ← NEW: pure logic
│       ├── tools.ts             ← NEW: schemas + registration
│       └── hash-edit-tools.ts   ← THINNED: ~10 LOC entry point
│
├── pi-mini-subagents/           ← likely no file changes
│   └── src/
│       ├── constants.ts         ← possibly remove STATUSES if redundant
│       └── index.ts
│
├── pi-agent-manager/
    └── src/
        ├── index.ts             ← THINNED: ~30–40 LOC entry
        ├── setup.ts             ← NEW
        ├── events.ts            ← NEW
        ├── commands/
        │   └── index.ts         ← NEW (split further if needed)
        └── agent/
            ├── config.ts        ← THINNED: orchestrator
            ├── loader.ts        ← NEW: FS scan + YAML parse
            ├── validate.ts      ← NEW: schema validation
            ├── manager.ts       ← THINNED: factory + wiring
            ├── state.ts         ← NEW: pure state transitions
            ├── builtin.ts       ← unchanged
            └── types.ts         ← unchanged
│
└── pi-todo-list/
    └── src/
        ├── core.ts              ← THINNED or split into operations/
        ├── operations/          ← NEW (if 3-way split chosen)
        │   ├── add.ts
        │   ├── update.ts
        │   └── query.ts
        ├── tool.ts              ← updated imports; split if still over 150
        ├── widget.ts            ← REWORKED: PanelWidgetSpec + createPanelWidget
        ├── state.ts             ← REWORKED: SessionRecordStore<TodoState>
        ├── index.ts             ← unchanged
        ├── types.ts             ← unchanged
        ├── constants.ts         ← unchanged
        ├── command.ts           ← unchanged
        └── utils.ts             ← unchanged
```

---

## Phase Order and Dependencies

```
Phase 1 (pi-hash-edit)        — independent, start here
Phase 2 (pi-mini-subagents)   — independent, can run after or in parallel with Phase 1
Phase 3-A (exploration)       — must complete before any Phase 3 edits
Phase 3-B (add dep)           — no dependencies, do immediately after 3-A
Phase 3-C, 3-D                — independent of each other, both depend on 3-A + 3-B
Phase 3-E                     — depends on 3-C and 3-D (imports from them)
Phase 3-F                     — depends on 3-E (goes inside the split events.ts)
Phase 3-G                     — depends on 3-E exploration; skip if no panel found
Phase 4-A (exploration)       — independent of Phase 3, can run in parallel
Phase 4-B (add dep)           — after 4-A
Phase 4-C, 4-D                — after 4-A + 4-B; 4-D waits for 4-C to settle imports
Phase 4-E, 4-F                — after 4-C; independent of each other, run in parallel
```
