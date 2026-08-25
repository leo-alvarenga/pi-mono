# @leo-alvarenga/pi-mini-subagents

Transient subagents for the [Pi coding agent](https://github.com/earendil-works/pi-mono).
Delegate a task to a separate headless `pi` process (its own context window),
get its findings back, and watch running/completed subagents live in a panel
above the input editor.

## Features

- **`mini_subagent` tool**: single mode (`task`) or parallel mode (`tasks[]`,
  max 8, 4 concurrent). Each subagent is a transient `pi --mode json -p --no-session`
  process, so it has an isolated context window and nothing is persisted.
- **Read-only by default**: subagents get `read/grep/find/ls`. Set
  `allowWrite: true` to grant `replace/insert/edit/write` (hash-anchored ops
  preferred).
- **No recursion**: children inherit `PI_SUBAGENT=1` and the extension no-ops
  on it, so a subagent can never spawn its own subagents.
- **Dynamic minimal prompt**: read-only restriction always; a write clause is
  appended only when `allowWrite` is set.
- **Question protocol**: a subagent that cannot proceed emits a `NEEDS_INPUT:`
  block in its final message. The tool reports the questions and instructs the
  caller to re-call with `answers` (a fresh subagent is spawned with them).
- **Live TUI panel** (`Alt+S`): header with running/done counts, Nerd Font
  status glyphs (⏳ running, ✓ done, ✗ failed, ? needs input), an 8-row budget
  with `… +N more`, and hidden entirely while empty.
- **`/subagents` command**: prints the full list grouped by status.
- **Session-isolated state**: survives `/reload` and compaction via replay
  from the session branch; no files written by the extension. Running records
  are dropped on replay (their processes do not survive a reload).

## Install

```bash
pi install npm:@leo-alvarenga/pi-mini-subagents
```

or add the local path / npm spec to your project `.pi/settings.json`, then run
`/reload`.

## Usage

```
"Use a subagent to find every place we do auth"
"Run 3 subagents in parallel: one for models, one for providers, one for routes"
```

Tool parameters:

- `task` (single mode) or `tasks` (parallel mode, array of `{ task, allowWrite?, answers?, cwd? }`)
- `allowWrite` (single mode, default false)
- `answers` (single mode re-spawn)
- `cwd` (single mode working directory)

## The NEEDS_INPUT loop

1. A subagent ends with:

   ```
   NEEDS_INPUT:
   - which auth provider should this use?
   ```

2. `mini_subagent` returns `needs_input` with the questions listed.
3. Answer them (ask the user if you don't know), then call `mini_subagent`
   again with the same `task` and your answers in `answers`. A new subagent is
   spawned with the answers embedded.

## Keybinding

`Alt+S` toggles the panel. If your terminal intercepts that chord, pick a free
one and change `PANEL_TOGGLE_CHORD` in `src/constants.ts`.

## Skill

The package ships a sample `subagent` skill (`skills/subagent/SKILL.md`),
auto-loaded by pi. It teaches the agent when to delegate to `mini_subagent`,
how to write self-contained tasks, and when to keep work in the main context.
To install it manually (e.g. without the extension), copy that `SKILL.md` into
`~/.pi/agent/skills/subagent/`.

## License

MIT — see [LICENSE](LICENSE). Copyright (c) 2026 Leonardo A. Alvarenga.
