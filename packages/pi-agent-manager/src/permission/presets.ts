import type { Ruleset } from "./types";

// ---------------------------------------------------------------------------
// Named presets
// ---------------------------------------------------------------------------

export const PERMISSION_PRESETS: Record<string, Ruleset> = {
  /** Read-only: inspection tools only. */
  read: [
    { permission: "*", pattern: "*", action: "deny" },
    { permission: "read", pattern: "*", action: "allow" },
    { permission: "grep", pattern: "*", action: "allow" },
    { permission: "glob", pattern: "*", action: "allow" },
    { permission: "list", pattern: "*", action: "allow" },
  ],

  /** Plan: read + web + subagent, no writes. */
  plan: [
    { permission: "*", pattern: "*", action: "deny" },
    { permission: "read", pattern: "*", action: "allow" },
    { permission: "grep", pattern: "*", action: "allow" },
    { permission: "glob", pattern: "*", action: "allow" },
    { permission: "list", pattern: "*", action: "allow" },
    { permission: "websearch", pattern: "*", action: "allow" },
    { permission: "webfetch", pattern: "*", action: "allow" },
    { permission: "task", pattern: "*", action: "allow" },
  ],

  /** Build: everything allowed; destructive shell ops gated. */
  build: [
    { permission: "*", pattern: "*", action: "allow" },
    { permission: "bash", pattern: "rm *", action: "ask" },
    { permission: "bash", pattern: "sudo *", action: "ask" },
    { permission: "bash", pattern: "chmod *", action: "ask" },
    { permission: "bash", pattern: "chown *", action: "ask" },
  ],
};

// ---------------------------------------------------------------------------
// Legacy migration
// ---------------------------------------------------------------------------

/**
 * Convert a legacy flat permission list (`["read","web","ask"]`) into a
 * Ruleset. Used to auto-migrate old user agent configs.
 */
export function fromLegacyPermissions(permissions: string[]): Ruleset {
  const ruleset: Ruleset = [];
  const has = (p: string) => permissions.includes(p);

  ruleset.push({ permission: "*", pattern: "*", action: "deny" });

  if (has("read")) {
    ruleset.push({ permission: "read", pattern: "*", action: "allow" });
    ruleset.push({ permission: "grep", pattern: "*", action: "allow" });
    ruleset.push({ permission: "glob", pattern: "*", action: "allow" });
    ruleset.push({ permission: "list", pattern: "*", action: "allow" });
  }

  if (has("write")) {
    ruleset.push({ permission: "edit", pattern: "*", action: "allow" });
    ruleset.push({ permission: "bash", pattern: "*", action: "allow" });
  }

  if (has("ask")) {
    ruleset.push({ permission: "edit", pattern: "*", action: "ask" });
    ruleset.push({ permission: "bash", pattern: "*", action: "ask" });
  }

  if (has("web")) {
    ruleset.push({ permission: "websearch", pattern: "*", action: "allow" });
    ruleset.push({ permission: "webfetch", pattern: "*", action: "allow" });
  }

  if (has("subagent")) {
    ruleset.push({ permission: "task", pattern: "*", action: "allow" });
  }

  return ruleset;
}
