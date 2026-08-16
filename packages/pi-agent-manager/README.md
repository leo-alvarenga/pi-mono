# @leo-alvarenga/pi-agent-manager

A [`pi-coding-agent`](https://github.com/earendil-works/pi-coding-agent) extension providing persona-based agent switching and OpenCode-style permission guards.

Each agent combines a system prompt persona with a permission ruleset that resolves tool executions into three actions:

- **`deny`**: Physically disables tools via `pi.setActiveTools()` so the model never sees them.
- **`ask`**: Pauses execution and prompts for interactive user confirmation (`once`, `always`, or `reject`).
- **`allow`**: Permits immediate tool execution without confirmation.

---

## How It Works

1. **Tool Stripping**: On startup or agent switch, the extension evaluates the active agent's ruleset. Tools matched with `deny` rules are filtered out entirely via `pi.setActiveTools()`
2. **Prompt Injection**: The active agent's system prompt (and optional XML permission envelope) is prepended to the system prompt before each conversation turn
3. **Interactive Gate**: When a tool configured with `ask` is invoked, a confirmation dialog appears. Selecting "always" appends a runtime rule to the session state to allow subsequent calls without prompting

---

## Built-In Agents

| Agent         | Description                                                                     | Default Ruleset Summary                                                                 |
| ------------- | ------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| **`planner`** | Analysis and inspection profile; cannot modify files or execute shell commands. | `read`, `grep`, `glob`, `list`, `web`, `task` allowed; `edit` and `bash` denied.        |
| **`builder`** | Full development profile with guarded destructive shell operations.             | All tools allowed; destructive commands (`rm`, `sudo`, `chmod`, `chown`) trigger `ask`. |

---

## Installation

Install via the `pi` package manager:

```bash
pi install npm:@leo-alvarenga/pi-agent-manager
```

After installation, restart `pi` or execute `/reload` within the TUI.

---

## Commands & Keybindings

### TUI Commands

| Command                   | Description                                                                  |
| ------------------------- | ---------------------------------------------------------------------------- |
| `/agents`                 | Opens the interactive agent selection picker                                 |
| `/agents <name>`          | Switches directly to the specified agent (supports tab-completion)           |
| `/agents_help`            | Displays active agent configuration and rule summaries                       |
| `/agent_guard [on / off]` | Toggles XML permission-envelope system prompt injection (toggles if omitted) |

_Note: Selected agents persist across sessions and are restored upon restarting_

### Custom Keybindings

Configure shortcuts in `~/.pi/agent/keybindings.json`:

```json
{
  "piAgentManager.next": "shift+tab",
  "piAgentManager.previous": "ctrl+shift+alt+p",
  "piAgentManager.picker": "ctrl+shift+alt+a"
}
```

Run `/reload` after updating keybindings.

---

## Permission Engine

The permission engine evaluates `{ permission, pattern }` pairs against defined rulesets.

**Evaluation Order**: Rules are evaluated top-to-bottom in definition order, where the **last matching rule takes precedence**. If no rule matches an invoked tool, the default fallback is `ask`.

### Permission Mappings

| Key         | Mapped Pi Tools                                                |
| ----------- | -------------------------------------------------------------- |
| `read`      | `read`                                                         |
| `grep`      | `grep`                                                         |
| `glob`      | `find`                                                         |
| `list`      | `ls`                                                           |
| `edit`      | `write`, `edit`, `delete_file`                                 |
| `bash`      | `bash`, `shell`, `run`, `exec`                                 |
| `websearch` | `web_search`, `source_check`, `get_search_content`             |
| `webfetch`  | `fetch_content`                                                |
| `task`      | `subagent`, `subagent_wait`, `subagent_supervisor`, `intercom` |
| `question`  | `questionnaire`, `ask_user_question`                           |

_Unlisted custom or MCP tools map directly to their exact tool name._

---

## Custom Agents

Add custom agent definition files (`.md`) with YAML frontmatter to `~/.pi/agent/agents/`:

```markdown
---
name: reviewer
description: Reviews code for quality, performance, and security issues
permissions:
  "*": deny
  read: allow
  grep: allow
  glob: allow
  list: allow
  websearch: allow
icon: ★
color: success
---

You are a Code Reviewer: focus on security, performance, and maintainability.
Read freely and suggest improvements, but never edit files or run commands.
```

### Frontmatter Schema

| Field         | Required | Description                                                                  |
| ------------- | -------- | ---------------------------------------------------------------------------- |
| `description` | **Yes**  | Short summary displayed in the selection picker and help views.              |
| `permissions` | **Yes**  | Preset name (`plan`, `build`, `read`), ruleset array, or full rule object.   |
| `name`        | No       | Unique identifier (defaults to filename without `.md`).                      |
| `type`        | No       | `primary` (default) or `subagent`.                                           |
| `icon`        | No       | Display icon/glyph placed before the agent name.                             |
| `color`       | No       | Theme color token (`accent`, `success`, `warning`, `error`, `info`, `dim`).  |
| `hidden`      | No       | Set to `true` to exclude from cycle shortcuts and the picker menu.           |
| `steps`       | No       | Maximum tool execution turns permitted before requesting a response summary. |
| `prompt`      | No       | Overrides markdown body text as the system prompt instructions.              |

### Permission Definition Formats

#### 1. Preset Strings

```yaml
permissions: plan # Read/web/subagent allowed; edit and bash denied
permissions: build # Full access; destructive bash commands gated with ask
permissions: read # Inspection tools only
```

#### 2. Legacy Array (Auto-converted to ruleset)

```yaml
permissions: [read, web, ask]
```

#### 3. Full Ruleset Object (OpenCode Compatible)

```yaml
permissions:
  "*": deny
  read: allow
  grep: allow
  glob: allow
  list: allow
  websearch: allow
  bash:
    "*": deny
    "npm test*": allow
    "npm run build*": allow
```

---

## Directory Layout

```
src/
├── index.ts              # Extension entry point, lifecycle hooks, and commands
├── constants.ts          # Key definitions, default values, and XML tags
├── agent/
│   ├── types.ts          # Agent state, configuration, and type definitions
│   ├── builtin.ts        # Default built-in agent definitions
│   ├── manager.ts        # Agent state machine and tool guard enforcement
│   └── config.ts         # User markdown agent and keybinding loaders
├── permission/
│   ├── types.ts          # Ruleset schemas, actions, and evaluation types
│   ├── evaluate.ts       # Core rule evaluation algorithms and state merging
│   ├── wildcard.ts       # Glob pattern matching engine
│   ├── mapping.ts        # Built-in tool-to-permission maps
│   └── presets.ts        # Preset profiles and legacy format converters
└── cli/
    ├── picker.ts         # Interactive TUI selection interface
    ├── help.ts           # Help renderer, permission badges, and validators
    └── logger.ts         # Wrapper for pi notification rendering

```
