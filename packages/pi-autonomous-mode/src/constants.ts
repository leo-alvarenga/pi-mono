export const MAX_MILESTONE_RETRIES = 3;
export const COMMAND_NAME = "autonomous";
export const TOOL_NAME = "autonomous_update";
export const STATE_ENTRY = "autonomous_state_v1";
export const SPAWN_GUARD_ENV = "PI_AUTONOMOUS_EXECUTOR";
export const NEEDS_INPUT_MARKER = "SUPERVISOR_NEEDS_INPUT";

export const ICONS: Record<string, string> = {
  failed: "✗",
  completed: "✓",
  in_progress: "→",
  needs_input: "○",
};
