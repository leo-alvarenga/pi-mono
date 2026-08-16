# pi-mono

Monorepo for my personal [pi](https://github.com/earendil-works/pi-coding-agent) packages.
Each package lives in `packages/`, keeps its own version, and is published to npm independently.

## Packages

| Package                           | Path                        | Description                                                |
| --------------------------------- | --------------------------- | ---------------------------------------------------------- |
| `@leo-alvarenga/pi-agent-manager` | `packages/pi-agent-manager` | Agent-mode switching with OpenCode-style permission guards |
| `@leo-alvarenga/pi-zen-frame`     | `packages/pi-zen-frame`     | Polished frame/header look for the TUI editor              |
| `@leo-alvarenga/pi-hash-edit`     | `packages/pi-hash-edit`     | Hash-anchored file read/edit tools (`hash_read`/`hash_edit`) |
