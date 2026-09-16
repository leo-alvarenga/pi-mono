# @leo-alvarenga/pi-ext-core

Shared building blocks for [pi](https://github.com/earendil-works/pi) extensions.

## Install

```
pnpm add @leo-alvarenga/pi-ext-core
```

## Usage

```ts
import { createSubagentRuntime, createSessionStore, createPanelWidget } from "@leo-alvarenga/pi-ext-core";
```

## Notes

- **Ships `.ts` sources** — requires pi's jiti loader. Plain Node tooling cannot import this without a build step. If you ever need a non-pi consumer, add `tsup` and repoint `exports`.
- All bundled pi packages (`@earendil-works/pi-ai`, `pi-agent-core`, `pi-coding-agent`, `pi-tui`, `typebox`) are `peerDependencies` — do not bundle them.
- Module-level state (e.g. `activeProcesses`) is per-consumer copy because pi loads packages with separate module roots. Do not use this lib to coordinate across extensions.

## License

MIT
