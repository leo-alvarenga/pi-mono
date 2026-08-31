---
name: track-progress
description: Track task progress through the todo tools (todo / todo_complete_all). Use for any multi-step task, plan execution, or ongoing work.
---

# Track Progress

Track work with the todo tools unless the user explicitly says not to:

- `todo add` — record each item the user wants tracked (text or texts).
- `todo update` — set `status: completed` as items finish; update status on every progress change (in-progress, blocked, …).
- `todo remove` — drop tasks that are no longer relevant.
- "complete everything" / "done with all" → `todo_complete_all`, not a loop of `todo update`.