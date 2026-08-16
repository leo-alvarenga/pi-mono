import type { ToolToPermission } from "./types";

/**
 * Maps every pi built-in tool to its permission-family key. Tools not listed
 * here fall back to using their own name as the key — so custom/MCP tools
 * get automatic per-tool granularity.
 */
export const TOOL_TO_PERMISSION: ToolToPermission = {
  // File inspection
  read: "read",
  grep: "grep",
  find: "glob",
  ls: "list",

  // File modification
  write: "edit",
  edit: "edit",
  delete_file: "edit",

  // Shell
  bash: "bash",
  shell: "bash",
  run: "bash",
  exec: "bash",

  // Web
  web_search: "websearch",
  source_check: "websearch",
  fetch_content: "webfetch",
  get_search_content: "websearch",

  // Subagents
  subagent: "task",
  subagent_wait: "task",
  subagent_supervisor: "task",

  // Intercom
  intercom: "task",

  // User interaction
  questionnaire: "question",
  ask_user_question: "question",
};

/**
 * Extract a pattern string from a tool call's arguments for permission
 * matching. Different tool families expose different argument fields.
 */
export function extractPattern(
  toolName: string,
  args: Record<string, unknown>,
): string {
  const permission = TOOL_TO_PERMISSION[toolName] ?? toolName;

  switch (permission) {
    case "read":
    case "edit":
    case "grep":
      return (args.path as string) ?? (args.filePath as string) ?? "*";
    case "glob":
    case "list":
      return (args.path as string) ?? (args.pattern as string) ?? "*";
    case "bash":
      return (args.command as string) ?? "*";
    case "websearch":
      return (args.query as string) ?? "*";
    case "webfetch":
      return (args.url as string) ?? "*";
    case "task":
      return (args.subagent_name as string) ?? (args.name as string) ?? "*";
    default:
      return "*";
  }
}
