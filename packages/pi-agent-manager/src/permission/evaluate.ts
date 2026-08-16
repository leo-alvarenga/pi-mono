import type { Rule, Ruleset } from "./types";
import { wildcardMatch } from "./wildcard";

/**
 * Valid values for the Claude CLI `--permission-mode` flag
 * (`manual` is an alias for `default`; omitted here).
 */
export type ClaudePermissionMode =
  | "default"
  | "acceptEdits"
  | "plan"
  | "auto"
  | "dontAsk"
  | "bypassPermissions";

/**
 * Map a ruleset to the closest Claude CLI permission mode:
 * `*`=deny → plan (read-only); `*`=allow → bypassPermissions when nothing
 * asks, else acceptEdits; anything else → default.
 */
export function permissionModeFor(...rulesets: Ruleset[]): ClaudePermissionMode {
  const merged = rulesets.flat();
  const star = evaluate("*", "*", merged).action;
  if (star === "deny") return "plan";
  if (star === "allow") {
    return merged.some((r) => r.action === "ask")
      ? "acceptEdits"
      : "bypassPermissions";
  }
  return "default";
}

/**
 * Evaluate a permission request against one or more rulesets.
 * Rulesets are flattened; the **last** matching rule wins.
 * Defaults to `"ask"` when no rule matches.
 */
export function evaluate(
  permission: string,
  pattern: string,
  ...rulesets: Ruleset[]
): Rule {
  const merged = rulesets.flat();
  const match = merged.findLast(
    (rule) =>
      wildcardMatch(permission, rule.permission) &&
      wildcardMatch(pattern, rule.pattern),
  );
  return match ?? { permission, pattern: "*", action: "ask" };
}

/**
 * Find tools whose `*` pattern resolves to `"deny"`. These are physically
 * stripped from the active set. Only `"*"` patterns count here — narrower
 * patterns are enforced at the ask gate.
 */
export function disabled(
  tools: string[],
  toolToPermission: Record<string, string>,
  ...rulesets: Ruleset[]
): Set<string> {
  const result = new Set<string>();
  for (const tool of tools) {
    const perm = toolToPermission[tool] ?? tool;
    if (evaluate(perm, "*", ...rulesets).action === "deny") {
      result.add(tool);
    }
  }
  return result;
}

/** Merge multiple rulesets — later rulesets' rules take precedence. */
export function merge(...rulesets: Ruleset[]): Ruleset {
  return rulesets.flat();
}
