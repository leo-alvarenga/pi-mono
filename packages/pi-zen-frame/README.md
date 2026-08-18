# @leo-alvarenga/pi-zen-frame

A [`pi-coding-agent`](https://github.com/earendil-works/pi) extension that gives the TUI editor a clean, minimalist layout with customizable status indicators and frames.

![Preview](./docs/preview.png)

## Features

- **Clean Frame**: Clean editor frame with segments placed above and below it to easily see relevant info
- **Header Box**: Optional Claude-style welcome panel displaying a logo, model/provider info, current working directory, and Git status
- **Working Messages**: Randomized loading status messages during response generation, updated on a configurable timer
- **Native Theme Support**: Uses pi `ThemeColor` tokens to automatically align with your active theme

---

## Installation

Run the following command:

```bash
pi install @leo-alvarenga/pi-zen-frame
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

  // Master mute: renders all segments in muted tones except agent-mode
  "zenMode": true,

  "header": {
    "enable": true,
    "logo": ["█████████  ", "███   ███  ", "██████     ", "███     ███"],
    "heading": "Welcome back!",
    "subheading": "Ready for your next session? Terminal warm, context clean, tools ready to execute",
    "logoColor": "text",
    "accentColor": "customMessageLabel",
  },

  "frame": {
    "enable": true,

    // Minimum terminal width required to render the border frame
    "minWidth": 20,

    // Padding inside the frame
    "paddingTop": 1,
    "paddingBottom": 1,
    "paddingX": 2,

    // Outer margin around the frame
    "marginTop": 0,
    "marginBottom": 0,

    // Toggle individual status segments
    "showCwd": true,
    "showModel": true,
    "showContext": true,
    "showThinking": true,
    "showSpinner": false,
    "showAgentMode": true,

    // Color options: "border", "accentColor", or "agentMode"
    "borderColor": "border",

    // Input prompt prefix glyph and color settings
    "prefix": "┃",
    "prefixColor": "muted", // Options: "agentMode", "frameBorder", or any ThemeColor

    // Override default Nerd-Font glyphs
    "icons": {
      // Keys: folder, model, context, thinking, gitDirty, gitBranch
    },

    // Per-segment foreground color overrides (supersedes default theme colors)
    "colors": {
      "model": "accent",
      "cwd": "accent",
    },
  },

  // Randomized status messages shown while streaming responses
  "workingMessage": {
    "enable": true,
    "intervalMs": 3000,
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

The editor window features status indicators embedded along the frame borders:

| Location         | Segment        | Description                                                           |
| ---------------- | -------------- | --------------------------------------------------------------------- |
| **Top Left**     | **model**      | Active model name and provider                                        |
|                  | **reasoning**  | Current reasoning effort level, tinted with pi thinking tokens        |
|                  | **spinner**    | Active phase indicator (`thinking`, `outputting`, `toolcall`, `exec`) |
| **Top Right**    | **ctx**        | Context usage percentage and token counts with color alerts           |
| **Bottom Left**  | **agent mode** | Active agent indicator pill from `pi-agent-manager`                   |
| **Bottom Right** | **cwd**        | Shortened path, active Git branch, and uncommitted file counts        |

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
├── components/         # Header, frame border, and status segment modules
├── editor/             # FrameEditor component for layout rendering
└── utils/              # Helpers for Git status, paths, and agent modes

```
