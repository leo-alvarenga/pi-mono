# pi-qol

Small quality-of-life features for [pi](https://github.com/earendil-works/pi-coding-agent), individually toggleable via a single config file.

## Install

```sh
pi install npm:@leo-alvarenga/pi-qol
# or from this repo:
pi -e ./packages/pi-qol
```

## Config

All features are enabled by default. Disable any feature in `~/.pi/agent/pi-qol.json` (file is optional):

```jsonc
{
  "external-editor-cwd": { "disabled": true }
}
```

Run `/reload` after editing any config.

---

## Feature: `external-editor-cwd`

Edit the current prompt in your external editor. The file is written to the current working directory so your editor can pick up project context (`.editorconfig`, LSP, etc.).

**Default key:** `ctrl+shift+e`

### Choosing the key

```jsonc
{ "external-editor-cwd": { "keybinding": "ctrl+shift+e" } }  // default
{ "external-editor-cwd": { "keybinding": "alt+e" } }         // any valid key id
{ "external-editor-cwd": { "keybinding": "native" } }        // take over pi's ctrl+g
```

Any invalid value is reported at session start and the extension falls back to `ctrl+shift+e`.

#### `"native"` mode

pi's built-in editor shortcut (`ctrl+g`) is in a reserved list that prevents extensions from claiming it while it is active. Setting `keybinding: "native"` writes `"app.editor.external": []` into `~/.pi/agent/keybindings.json` to release that binding, then prompts you to run `/reload` once. After that single reload, `ctrl+g` opens this extension's editor instead.

- The file reformat is intentional: pi rejects comments in `keybindings.json` anyway.
- Reverting: remove the `[]` entry and switch `keybinding` away from `"native"`.

### Editor selection

Follows pi's own order: `settings.json:externalEditor` → `$VISUAL` → `$EDITOR` → `nano` (`notepad` on Windows).

### Behaviour

1. The current prompt is written to `./prompt-<id>.md` in the working directory.
2. The TUI suspends and hands the terminal to the editor.
3. **Exit 0:** the file is read back into the prompt editor and deleted.
4. **Non-zero exit or spawn failure:** the file is kept and its path is shown in a warning — your text is safe.
5. **Unwritable cwd:** the file is written to the OS temp dir instead.
6. `super+` bindings require a terminal with [Kitty keyboard protocol](https://sw.kovidgoyal.net/kitty/keyboard-protocol/) support.
7. The shortcut requires the prompt editor to have focus. Extensions that replace the editor component must forward `onExtensionShortcut` for this to work.
