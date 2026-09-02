# @leo-alvarenga/pi-zen-frame

A [`pi-coding-agent`](https://github.com/earendil-works/pi) extension that gives the TUI editor a clean, minimalist layout with customizable status indicators and frames.

![Preview](./docs/preview.png)

## Features

- **Clean Frame**: Clean editor frame with status segments rendered below the editor
- **Header Box**: Optional welcome panel with a logo and "Welcome back!" heading, model name, current working directory, Git status, and a random tip
- **Working Messages**: Randomized loading status messages during response generation, updated on a configurable timer
- **Native Theme Support**: Uses pi `ThemeColor` tokens to automatically align with your active theme

---

## Installation

Run the following command:

```bash
pi install npm:@leo-alvarenga/pi-zen-frame
```

Or add `pi-zen-frame` to your pi packages list in `~/.pi/agent/settings.json`:

```jsonc
{
  "packages": ["npm:@leo-alvarenga/pi-zen-frame"],
}
```

Then, restart pi or run `/reload` in the console.

---

## Configuration

Configuration is loaded from `~/.pi/agent/pi-zen-frame.json`. All properties are optional.

```jsonc
{
  // Fallback accent color for frame border and active segments
  "accentColor": "accent",

  // Master mute: renders all segments in muted tones except agent-mode (default: false)
  "zenMode": false,

  // Editor-frame renderer by registered name (built-in: "blocky")
  "editorFrame": "blocky",

  "header": {
    // Welcome panel is opt-in (default: false)
    "enable": false,
    // Header renderer by registered name (built-in: "basic")
    "type": "basic",
  },

  "frame": {
    "enable": true,

    // Minimum terminal width required to render the border frame
    "minWidth": 20,

    // Toggle individual status segments
    "showCwd": true,
    "showModel": true,
    "showContext": true,
    "showThinking": true,
    "showSpinner": false,
    "showAgentMode": true,
  },

  // Randomized status messages shown while streaming responses
  "workingMessage": {
    "enable": true,
    "intervalMs": 3000,
    // Omit to use the built-in message pool
    "messages": [
      "Exploring the seas",
      "Tinkering with strange objects",
      "Analyzing patterns",
    ],
  },
}
```

---

## Structure & Status Segments

The editor frame shows status indicators in two rows below the editor:

| Location           | Segment        | Description                                                                                                                                         |
| ------------------ | -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Editor band (left) | **agent mode** | Active agent indicator pill from `pi-agent-manager`                                                                                                 |
|                    | **model**      | Active model name and provider                                                                                                                      |
|                    | **reasoning**  | Current reasoning effort level, tinted with pi thinking tokens                                                                                      |
|                    | **spinner**    | Active phase indicator (`thinking`, `outputting`, `toolcall`, `exec`); replaces the row while streaming when `showSpinner` is enabled (default off) |
| Footer (left)      | **cwd**        | Shortened path, active Git branch, and uncommitted file counts                                                                                      |
| Footer (right)     | **ctx**        | Context usage percentage and token counts with color alerts                                                                                         |

---

## Commands & Keybindings

- **Toggle Command**: `/zen_mode` — Toggles Zen mode on and off.
- **Default Keybinding**: `ctrl+shift+z`

To rebind or disable the hotkey, update `~/.pi/agent/keybindings.json`:

```jsonc
{
  "piZenFrame.zenMode": "ctrl+shift+z", // Set to [] to disable the shortcut
}
```

Run `/reload` after modifying your keybindings.

---

## Directory Layout

```
extensions/
├── index.ts            # Extension entry point: config initialization and events
├── config/             # Types, defaults, and settings normalization
├── components/         # Status segments, header, and frame layout helpers
├── editor/             # BlockyEditor editor-frame renderer
├── renderers/          # Renderer registry + swap-in API (blocky / basic)
└── utils/              # Helpers for Git status, paths, agent modes, and token usage

```
