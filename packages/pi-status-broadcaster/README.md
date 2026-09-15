# @leo-alvarenga/pi-status-broadcaster

A pi extension that broadcasts the status of every active session to a shared JSON file at `/tmp/pi-status-broadcaster/status.json`.

External tools (scripts, status bars, dashboards) can poll this file to inspect running pi sessions without any IPC.

## Features

- Writes session status (`IDLE` / `BUSY`) on every agent turn boundary
- Auto-generates a human-readable session name on first start (docker-style `adjective-noun`)
- Name is persisted in the report file and recovered on resume — even after the session finishes
- `/rename-session <name>` command to set a custom name at any time
- Atomic writes via temp-file rename — safe for concurrent readers
- Session ID is stable across resumes (uses pi's own session ID)

## Install

```bash
pi install npm:@leo-alvarenga/pi-status-broadcaster
```

Or add the npm spec to your `.pi/settings.json` `packages` and run `/reload`.

## Commands

| Command | Description |
|---------|-------------|
| `/rename-session <name>` | Rename the current session. The name is saved to the report file immediately and persisted across resumes. |

## Report schema

```ts
type ReportSchema = Record<string, SessionEntry | FinishedEntry>;

type SessionEntry = {
  id: string;
  cwd: string;
  name?: string;         // human-readable name (auto-generated or set via /rename-session)
  createdAt: string;
  resumedAt?: string;
  lastUpdatedAt: string;
  currentModel: string;
  tokens: { total: number; input: number; output: number };
  todos: { done: number; created: number; inProgress: number };
  status: "IDLE" | "BUSY";
};

type FinishedEntry = {
  finished: true;
  name?: string;         // preserved so resume can recover the original name
  createdAt: string;
  finishedAt: string;
};
```

- `IDLE` — session is waiting for user input
- `BUSY` — agent is actively generating a response
- A `FinishedEntry` is written on session shutdown; it is overwritten with a fresh `SessionEntry` on resume

## File safety

Writes go through an atomic `writeFileSync` + `renameSync` on a `.pid.tmp` sidecar, so readers never see a partial file.

## License

MIT
