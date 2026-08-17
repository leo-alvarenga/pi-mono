/** External contract IDs: the zen-mode keybinding and the optional
 *  pi-agent-manager integration (no hard dependency).
 */
/** pi-agent-manager integration (optional — no hard dependency). */
export const PI_AGENT_MANAGER_AGENT_EVENT = "pi-agent-manager:agent-changed";
export const PI_AGENT_MANAGER_AGENT_DATA_KEY = "pi-agent-manager-agent";

/** Keybinding id users bind in keybindings.json to toggle zen mode. */
export const ZEN_MODE_SHORTCUT_ID = "piZenFrame.zenMode";
/** Default key when the user hasn't bound one (override or disable via
 *  keybindings.json; `[]` disables the shortcut, `/zen_mode` still works). */
export const ZEN_MODE_DEFAULT_KEY = "ctrl+shift+z";
