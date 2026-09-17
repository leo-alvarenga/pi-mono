# @leo-alvarenga/pi-ext-core

Shared building blocks for pi extensions: types, utilities, headless agent runtime, session store, TUI panel widget, and subagent runtime factory.

## Installation

```bash
pnpm add @leo-alvarenga/pi-ext-core
```

**Peer dependencies** (all bundled in every pi installation):

```bash
pnpm add -D @earendil-works/pi-ai @earendil-works/pi-agent-core @earendil-works/pi-coding-agent @earendil-works/pi-tui typebox
```

## Usage

```ts
import {
  createSubagentRuntime,
  createSessionStore,
  createPanelWidget,
} from "@leo-alvarenga/pi-ext-core";

// register the full subagent tool + panel + command in one call
createSubagentRuntime(pi, spec);

// or use individual primitives
const store = createSessionStore<MyState>(pi, "my.entry", defaultState);
const panel = createPanelWidget(pi, store, panelSpec);
```

## Surface note

This lib ships `.ts` sources and is designed for pi's [jiti](https://github.com/unjs/jiti) loader: no compile step required for pi consumers. It is not importable by plain Node without a loader.

## Modules

| Export              | Description                                                                                         |
| ------------------- | --------------------------------------------------------------------------------------------------- |
| `types`             | `StatusUi`, `PANEL_STATE_ICON`, `TokenUsage`, `HeadlessRunResult`                                   |
| `utils/strings`     | `capitalize`, `truncateChars`, `truncateBytes`, `formatTokens`, `formatDuration`                    |
| `utils/concurrency` | `mapWithConcurrencyLimit`                                                                           |
| `headless/*`        | `getPiInvocation`, `createEventReducer`, `runHeadlessAgent`, `killAllRunning`                       |
| `session/store`     | `createSessionStore<T>`                                                                             |
| `tui/panel`         | `createPanelWidget<T>`                                                                              |
| `subagents/runtime` | `createSubagentRuntime`, `buildSystemPrompt`, `buildAllowlist`, `parseNeedsInput`, `classifyResult` |

## License

MIT
