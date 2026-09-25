# @leo-alvarenga/pi-autonomous-mode

> THIS IS A WORK IN PROGRESS AND A POC ONLY; I am currently trying to accertain whether this is a good idea or not.

A Pi extension that turns the agent into a durable Supervisor capable of researching a goal, breaking it into structured database entries, and driving Executor subagents to completion — surviving crashes and resuming from any failure point.

## Peer dependencies

- `@leo-alvarenga/pi-mini-subagents` — must be loaded before this extension so the `mini_subagents` tool is registered.

## Commands

| Command                    | Description                                     |
| -------------------------- | ----------------------------------------------- |
| `/autonomous start <file>` | Start researching and planning from a goal file |
| `/autonomous resume <id>`  | Resume a paused or crashed goal                 |
| `/autonomous status`       | Show current goal progress                      |
| `/autonomous list`         | List all goals                                  |
| `/autonomous abort`        | Pause the active goal                           |

## How it works

1. **Researcher phase**: Supervisor reads the goal, asks clarifying questions, then calls `autonomous_update` with `action="plan_goal"` to create Epics and Milestones.
2. **Execution phase**: Supervisor spawns Executor subagents via `mini_subagents` (max 2 in parallel), tracks results, retries failures, and marks the goal done.
3. **Recovery**: Use `/autonomous resume <id>` after a crash — state is reconstructed from SQLite.
