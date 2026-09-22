# pi-mono

A monorepo of extensions and packages for [pi](https://github.com/earendil-works/pi-coding-agent).

## Packages

| Package                                                                    | Version                                                                                                                                         | Description                                                        |
| -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| [`@leo-alvarenga/pi-agent-manager`](./packages/pi-agent-manager)           | [![npm](https://img.shields.io/npm/v/@leo-alvarenga/pi-agent-manager)](https://www.npmjs.com/package/@leo-alvarenga/pi-agent-manager)           | Persona-based agent switching and OpenCode-style permission guards |
| [`@leo-alvarenga/pi-hash-edit`](./packages/pi-hash-edit)                   | [![npm](https://img.shields.io/npm/v/@leo-alvarenga/pi-hash-edit)](https://www.npmjs.com/package/@leo-alvarenga/pi-hash-edit)                   | Hash-anchored file editing tools                                   |
| [`@leo-alvarenga/pi-mini-subagents`](./packages/pi-mini-subagents)         | [![npm](https://img.shields.io/npm/v/@leo-alvarenga/pi-mini-subagents)](https://www.npmjs.com/package/@leo-alvarenga/pi-mini-subagents)         | Delegate tasks to transient headless subagents                     |
| [`@leo-alvarenga/pi-notify`](./packages/pi-notify)                         | [![npm](https://img.shields.io/npm/v/@leo-alvarenga/pi-notify)](https://www.npmjs.com/package/@leo-alvarenga/pi-notify)                         | Desktop notifications for pi session events                        |
| [`@leo-alvarenga/pi-status-broadcaster`](./packages/pi-status-broadcaster) | [![npm](https://img.shields.io/npm/v/@leo-alvarenga/pi-status-broadcaster)](https://www.npmjs.com/package/@leo-alvarenga/pi-status-broadcaster) | Broadcasts session status to a shared JSON file for external tools |
| [`@leo-alvarenga/pi-todo-list`](./packages/pi-todo-list)                   | [![npm](https://img.shields.io/npm/v/@leo-alvarenga/pi-todo-list)](https://www.npmjs.com/package/@leo-alvarenga/pi-todo-list)                   | In-session todo list with slash commands and a TUI widget          |
| [`@leo-alvarenga/pi-zen-frame`](./packages/pi-zen-frame)                   | [![npm](https://img.shields.io/npm/v/@leo-alvarenga/pi-zen-frame)](https://www.npmjs.com/package/@leo-alvarenga/pi-zen-frame)                   | Minimalist editor renderer and command palette                     |

## Libraries

Internal shared libraries used by the packages above. Not pi extensions themselves — consumed as `workspace:^` dependencies.

| Library                                            | Version                                                                                                                     | Description                                                                           |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| [`@leo-alvarenga/pi-ext-core`](./libs/pi-ext-core) | [![npm](https://img.shields.io/npm/v/@leo-alvarenga/pi-ext-core)](https://www.npmjs.com/package/@leo-alvarenga/pi-ext-core) | Types, utils, headless runtime, session store, panel widget, subagent runtime factory |

## Development

This repo uses [pnpm workspaces](https://pnpm.io/workspaces).

```bash
pnpm install
pnpm --filter <package-name> build
```

## License

MIT
