/** Directory inside pi's agent dir where user .md files live. */
export const AGENTS_DIR_NAME = "agents";

/** File extension for user-agent definitions. */
export const AGENT_FILE_EXTENSION = ".md";

export const AGENT_DATA_KEY = "pi-agent-manager-agent";
export const AGENT_CHANGED_EVENT = "pi-agent-manager:agent-changed";

export const AGENT_PROFILE_START_TAG = "<!-- AGENT_PROFILE_START -->";
export const AGENT_PROFILE_END_TAG = "<!-- AGENT_PROFILE_END -->";

export const AGENT_SHORTCUT_IDS = {
  next: "piAgentManager.next",
  previous: "piAgentManager.previous",
  picker: "piAgentManager.picker",
} as const;

export const LOGGER_KEY = "pi-agent-manager";
export const LOGGER_PREFIX = `[${LOGGER_KEY}]`;

export const DEFAULT_AGENT_ICON = "◆";
