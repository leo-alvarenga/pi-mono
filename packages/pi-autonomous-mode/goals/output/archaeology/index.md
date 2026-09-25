# pi-mono — Codebase Archaeology (Static Snapshot)

Orientation-level survey of the pnpm monorepo at `/home/lasilva/personal/pi-mono`, as it exists
today. No history narrative; every version below is the lockfile-resolved / `package.json`-declared
version at snapshot time.

## What pi-mono is

A monorepo of extensions and packages for [pi](https://github.com/earendil-works/pi-coding-agent)
(`README.md`). It holds two kinds of workspace members: **pi extensions** shipped as raw TypeScript
and loaded by the host at runtime, and **internal libraries** consumed by those extensions via
`workspace:*`. The root README presents the repo as a catalog of independently published npm packages
under the `@leo-alvarenga/` scope — this index is that catalog plus the machinery behind it.

## Metrics at a glance

| Metric | Value |
|---|---|
| Workspace packages | 10 (8 under `packages/*`, 2 under `libs/*`) |
| Total TS LOC | ~12,538 (incl. generated `dist/types` declarations in 2 packages; source-only 11,954) |
| Commits at snapshot (`git rev-list --count HEAD`) | 138 |
| `pi.on(...)` event registrations | 33 |
| `pi.registerCommand(...)` | 10 |
| `pi.registerTool(...)` | 6 (production call sites; +2 in test mocks) |
| `pi.registerShortcut(...)` | 4 |
| `pi.setSessionName(...)` | 3 |
| Packages with no test script | 1 (`pi-autonomous-mode`, 2183 LOC — the largest package) |
| Packages missing from root README | 1 (`pi-autonomous-mode`, grep `autonomous README.md` → 0) |

## Package inventory

`Layout root` = directory holding the extension entry; `Extension entry` = the path declared in the
non-standard `pi` field of `package.json`.

| Package | Directory | Version | Layout root | Extension entry | TS LOC | Tests |
|---|---|---|---|---|---|---|
| `@leo-alvarenga/pi-agent-manager` | `packages/pi-agent-manager` | 0.18.15 | `src` | `./src/index.ts` | 1663 | yes |
| `@leo-alvarenga/pi-autonomous-mode` | `packages/pi-autonomous-mode` | 0.6.0 | `src` | `./src/index.ts` | 2183 | **NONE** |
| `@leo-alvarenga/pi-hash-edit` | `packages/pi-hash-edit` | 0.2.8 | `src` | `./src/hash-edit-tools.ts` | 328 | yes |
| `@leo-alvarenga/pi-mini-subagents` | `packages/pi-mini-subagents` | 0.4.2 | `src` | `./src/index.ts` | 292 | yes |
| `@leo-alvarenga/pi-notify` | `packages/pi-notify` | 0.2.11 | `src` | `./src/index.ts` | 382 | yes |
| `@leo-alvarenga/pi-status-broadcaster` | `packages/pi-status-broadcaster` | 0.3.5 | `extensions` | `./extensions/index.ts` | 576 | yes |
| `@leo-alvarenga/pi-todo-list` | `packages/pi-todo-list` | 0.8.1 | `src` | `./src/index.ts` | 999 | yes |
| `@leo-alvarenga/pi-zen-frame` | `packages/pi-zen-frame` | 0.22.0 | `extensions` | `./extensions/index.ts` | 3428 | yes |
| `@leo-alvarenga/pi-ext-core` | `libs/pi-ext-core` | 0.6.1 | `src` | (none — library) | 2117 | yes |
| `@leo-alvarenga/pi-sqlite` | `libs/pi-sqlite` | 0.3.0 | `src` | (none — library) | 570 | yes |

Notes: `pi-status-broadcaster` (576) and `pi-zen-frame` (3428) include their checked-in build output
under `dist/types`; their source-only counts are 520 and 2900. `pi-hash-edit` and `pi-mini-subagents`
additionally declare `pi.skills: ["./skills"]`; only `pi-hash-edit` actually has that directory — see
[findings.md](./findings.md). The two `libs/*` members are not extensions: they carry no `pi` field,
publish an `exports` map pointing at `./src/index.ts`, and are depended on with `workspace:*`.

## Glossary

- **pi** — the host CLI/agent (`@earendil-works/pi-coding-agent`) that loads extensions at runtime.
- **pi extension** — a module exporting registrations against a `pi` API object (`pi.on`, `registerCommand`, `registerTool`, `registerShortcut`, `setSessionName`).
- **pi package** — an npm package carrying the `pi` field so the host auto-discovers its extensions/skills.
- **skill** — a directory of markdown instructions a pi package ships for on-demand reuse; declared as `pi.skills`.
- **`pi` field** — a non-standard key in `package.json` (sibling to `exports`): `{"extensions": [...], "skills": [...]}`. Not part of npm's spec; the host reads it.
- **peer-declared host dependency** — `@earendil-works/pi-coding-agent: "*"` listed under `peerDependencies`, never `dependencies`. Resolved once at 0.84.2 via lockfile `autoInstallPeers: true`.
- **headless agent** — a pi agent run programmatically (no TUI), e.g. for subagents.
- **goal / epic / milestone** — the autonomous-mode work hierarchy: a goal markdown file decomposes into epics, each epic into ordered milestone tasks (see `goals/01-hello-autonomous.md`).

## How to read this report

Start with [repo-anatomy.md](./repo-anatomy.md) for the top-level shape, then the package files for
depth. Cross-cutting files can be read independently.

Repository level:
- [repo-anatomy.md](./repo-anatomy.md) — root layout, workspace globs, tsconfig/entry conventions
- [development-and-release.md](./development-and-release.md) — scripts, toolchain, publish flow
- [dependency-map.md](./dependency-map.md) — host deps, `workspace:*` edges, lockfile versions
- [host-api-contract.md](./host-api-contract.md) — the public `@earendil-works/pi-*@0.84.2` extension API
- [findings.md](./findings.md) — aggregated severity-ranked findings

Libraries:
- [packages/pi-ext-core.md](./packages/pi-ext-core.md)
- [packages/pi-sqlite.md](./packages/pi-sqlite.md)

Extensions:
- [packages/pi-agent-manager.md](./packages/pi-agent-manager.md)
- [packages/pi-autonomous-mode.md](./packages/pi-autonomous-mode.md)
- [packages/pi-hash-edit.md](./packages/pi-hash-edit.md)
- [packages/pi-mini-subagents.md](./packages/pi-mini-subagents.md)
- [packages/pi-notify.md](./packages/pi-notify.md)
- [packages/pi-status-broadcaster.md](./packages/pi-status-broadcaster.md)
- [packages/pi-todo-list.md](./packages/pi-todo-list.md)
- [packages/pi-zen-frame.md](./packages/pi-zen-frame.md)
