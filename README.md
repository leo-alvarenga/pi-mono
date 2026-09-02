# pi-mono

Monorepo for my personal [pi](https://github.com/earendil-works/pi-coding-agent) packages.
Each package lives in `packages/`, keeps its own version, and is published to npm independently.

## Packages

| Package                            | Path                         | Latest | Description                                                  |
| ---------------------------------- | ---------------------------- | ------ | ------------------------------------------------------------ |
| `@leo-alvarenga/pi-agent-manager`  | `packages/pi-agent-manager`  | 0.18.3 | Agent-mode switching with OpenCode-style permission guards   |
| `@leo-alvarenga/pi-zen-frame`      | `packages/pi-zen-frame`      | 0.16.1 | Polished frame/header look for the TUI editor                |
| `@leo-alvarenga/pi-hash-edit`      | `packages/pi-hash-edit`      | 0.2.1  | Hash-anchored file read/edit tools (`hash_read`/`hash_edit`) |
| `@leo-alvarenga/pi-mini-subagents` | `packages/pi-mini-subagents` | 0.1.1  | Transient subagents: `mini_subagent` tool + live TUI panel   |
| `@leo-alvarenga/pi-todo-list`      | `packages/pi-todo-list`      | 0.4.2  | Session-aware todo list overlay + live TUI panel             |
| `@leo-alvarenga/pi-notify`        | `packages/pi-notify`        | 0.1.0  | Desktop notification + sound when a prompt settles (D-Bus, Linux, opt-in) |
