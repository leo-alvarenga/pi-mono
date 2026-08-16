import type { Action, Rule } from "../permission/types";
import type { AgentConfig } from "../agent/types";
import type { Logger } from "./logger";

// ---------------------------------------------------------------------------
// String helpers
// ---------------------------------------------------------------------------

export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function agentToLabel(agent: AgentConfig): string {
  return capitalize(agent.name).replace(/(_|-)/g, " ");
}

function truncate(str: string, max: number, suffix = " [...]"): string {
  if (str.length <= max - suffix.length) return str;
  return str.slice(0, max - suffix.length) + suffix;
}

// ---------------------------------------------------------------------------
// Permission badges
// ---------------------------------------------------------------------------

/**
 * Compact badge row showing the resolved action for each tool family.
 * Maps to OpenCode's per-agent permission display.
 */
const BADGE_FAMILIES = [
  { key: "read", label: "read" },
  { key: "edit", label: "write" },
  { key: "bash", label: "bash" },
  { key: "websearch", label: "web" },
  { key: "task", label: "subagent" },
] as const;

export function getPermissionBadges(agent: AgentConfig): string {
  const ruleset = agent.permissions;

  function actionFor(perm: string): Action {
    const rule = [...ruleset]
      .reverse()
      .find((r) => r.permission === perm && r.pattern === "*");
    return rule?.action ?? "ask";
  }

  function badge(action: Action): string {
    switch (action) {
      case "allow": return "✓";
      case "ask":   return "!";
      case "deny":  return "✗";
    }
  }

  return BADGE_FAMILIES
    .map((f) => `${f.label} ${badge(actionFor(f.key))}`)
    .join(" · ");
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export function isValidAgent(name: string, agents: AgentConfig[]): boolean {
  return agents.some((a) => a.name === name.toLowerCase());
}

export function getValidAgentNames(agents: AgentConfig[]): string[] {
  return agents.map((a) => a.name);
}

// ---------------------------------------------------------------------------
// Help text
// ---------------------------------------------------------------------------

function ruleSummary(rule: Rule): string {
  const scope = rule.pattern === "*" ? "" : ` (${rule.pattern})`;
  return `${rule.permission}${scope}=${rule.action}`;
}

function agentSummary(agent: AgentConfig, logger: Logger): string {
  let label = capitalize(agent.name);
  if (agent.icon) label = `${agent.icon} ${label}`;
  label = logger.bold(logger.fg(agent.color ?? "accent", label));

  const badges = getPermissionBadges(agent);
  const prompt = logger.fg("muted", truncate(agent.prompt || "(None)", 80));

  return [
    `  - ${label}`,
    `    Description: ${agent.description}`,
    `    Permissions: ${badges}`,
    `    Rules:       ${agent.permissions.map(ruleSummary).join(", ") || "(none)"}`,
    `    Prompt:      ${prompt}`,
  ].join("\n");
}

export function getHelpText(
  agents: AgentConfig[],
  logger: Logger,
  shortcuts: Map<string, string[]>,
): string {
  const fmtKeys = (id: string) => {
    const keys = shortcuts.get(id);
    return keys?.length ? keys.join(", ") : "(unbound)";
  };

  return [
    logger.bold("pi-agent-manager — agents & permissions"),
    "",
    "Agents:",
    ...agents.map((a) => agentSummary(a, logger)),
    "",
    "Commands:",
    "  /agents          Open the interactive agent picker",
    "  /agents <name>   Switch directly to an agent (tab-complete)",
    "  /agents_help     Show this help",
    "",
    "Keybindings:",
    `  Next agent:     ${fmtKeys("piAgentManager.next")}`,
    `  Previous agent: ${fmtKeys("piAgentManager.previous")}`,
    `  Agent picker:   ${fmtKeys("piAgentManager.picker")}`,
    "",
    "Permissions model (last-matching-rule-wins):",
    "  allow  — tool runs without approval",
    "  ask    — prompted for confirmation each call",
    "  deny   — tool physically disabled",
    "",
    "User .md files go in ~/.pi/agent/agents/*.md",
    "See README for the YAML frontmatter format.",
  ].join("\n");
}
