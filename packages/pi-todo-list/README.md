# @leo-alvarenga/pi-todo-list

Session-aware todo list overlay for the [Pi coding agent](https://github.com/earendil-works/pi-mono).
The agent manages tasks with a `todo` tool while you watch them live in a panel above the input editor.

## Features

- **`todo` tool** — the agent can add tasks, update their status
  (`pending` → `in-progress` → `completed`), declare dependencies
  (`blockedBy`), remove, list, and clear. Invalid operations (unknown ids,
  self-blocks, dependency cycles) are rejected before any state change.
- **Live TUI panel** above the input editor — a header line with a
  collapse/expand chevron and per-status counters, Nerd Font status glyphs
  (  pending, 󱥸  in-progress,   completed), blocked-task hints, and a hardcoded
  8-row budget with a `… +N more` summary line. The panel hides itself
  entirely while the list is empty.
- **Toggle with `Alt+T`** — collapsed by default; collapsed shows just the
  header line.
- **`/todos` command** — prints the full list grouped by status straight to
  the terminal transcript.
- **Batch operations** — `todo add` accepts a `texts` array to add many at
  once, and `todo remove` accepts an `ids` array to remove many at once.
- **`todo_complete_all` tool** — marks every todo completed and clears the
  list in one call, telling you how many items were completed.
- **Session-isolated state** — each session has its own list; it survives
  `/reload` and context compaction with no external files, because state is
  replayed from the session branch (tool results + custom entries), never
  written by the extension itself.
- **No configuration, no localization** — all limits are hardcoded constants
  and all text is English.

## Install

```bash
pi install npm:@leo-alvarenga/pi-todo-list
```

or add the local path / npm spec to your project `.pi/settings.json`, then
run `/reload`.

## Usage

Tell the agent: _"track these tasks as todos: …"_, or use the tool directly:

- `todo add` with `text`
- `todo update` with `id` and optional `status` / `text` / `blockedBy`
- `todo remove` / `todo list` / `todo clear`

Run `/todos` yourself at any time to see the full grouped list.

## Keybinding

`Alt+T` toggles the panel. If your terminal intercepts that chord
(e.g. GNOME Terminal opens a new tab), pick a free one and change
`PANEL_TOGGLE_CHORD` in `src/constants.ts`.

## License

MIT — see [LICENSE](LICENSE). Copyright (c) 2026 Leonardo A. Alvarenga.
