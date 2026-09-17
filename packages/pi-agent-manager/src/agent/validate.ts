import { basename } from "node:path";
import { getAgentDir, type ThemeColor } from "@earendil-works/pi-coding-agent";

import { AGENT_FILE_EXTENSION } from "../constants";
import type { AgentConfig, AgentType } from "./types";
import type { Action, Ruleset } from "../permission/types";
import {
  fromLegacyPermissions,
  PERMISSION_PRESETS,
} from "../permission/presets";

const VALID_ACTIONS: readonly Action[] = ["allow", "ask", "deny"];
const VALID_TYPES: readonly AgentType[] = ["primary", "subagent"];

export type ValidatedAgent =
  { ok: true; agent: AgentConfig } | { ok: false; error: string };

export function validateAgent(
  fm: Record<string, unknown>,
  body: string,
  fileName: string,
): ValidatedAgent {
  // Name
  const name =
    (fm.name as string)?.toLowerCase() ??
    basename(fileName, AGENT_FILE_EXTENSION).toLowerCase();
  if (!name) return { ok: false, error: "Missing agent name" };

  // Description (required)
  const description = fm.description as string | undefined;
  if (!description || typeof description !== "string") {
    return { ok: false, error: "Missing or invalid description" };
  }

  // Permissions (required)
  const permissions = parsePermissions(fm.permissions);
  if (!permissions.ok) return permissions;

  // Type
  const type = fm.type as AgentType | undefined;
  if (type && !VALID_TYPES.includes(type)) {
    return {
      ok: false,
      error: `Invalid type "${type}" — must be primary or subagent`,
    };
  }

  // Color
  const color = fm.color as ThemeColor | undefined;

  // Icon
  const icon = typeof fm.icon === "string" ? fm.icon : undefined;

  // Hidden
  const hidden = fm.hidden === true ? true : undefined;

  // Steps
  const steps =
    typeof fm.steps === "number" && fm.steps > 0 ? fm.steps : undefined;

  return {
    ok: true,
    agent: {
      name,
      description,
      permissions: permissions.ruleset,
      type: type ?? "primary",
      color,
      icon,
      hidden,
      steps,
      prompt: body || undefined,
    },
  };
}

// Permission parsing (handles legacy + new formats)
type ParsedPerms =
  { ok: true; ruleset: Ruleset } | { ok: false; error: string };

function parsePermissions(raw: unknown): ParsedPerms {
  // 1. String shorthand: reference a named preset
  if (typeof raw === "string") {
    const preset = PERMISSION_PRESETS[raw.toLowerCase()];
    if (preset) return { ok: true, ruleset: [...preset] };
    return {
      ok: false,
      error: `Unknown permission preset "${raw}". Valid: ${Object.keys(PERMISSION_PRESETS).join(", ")}`,
    };
  }

  // 2. Legacy array: ["read", "web", "ask"]
  if (Array.isArray(raw) && raw.every((e) => typeof e === "string")) {
    return { ok: true, ruleset: fromLegacyPermissions(raw as string[]) };
  }

  // 3. New Ruleset object: { "*": "deny", read: "allow", bash: { "rm *": "ask" } }
  if (typeof raw === "object" && raw !== null && !Array.isArray(raw)) {
    return parseRulesetObject(raw as Record<string, unknown>);
  }

  return {
    ok: false,
    error:
      "permissions must be a preset string, a legacy array, or a ruleset object",
  };
}

function parseRulesetObject(obj: Record<string, unknown>): ParsedPerms {
  const ruleset: Ruleset = [];

  for (const [permission, value] of Object.entries(obj)) {
    if (typeof value === "string") {
      if (!VALID_ACTIONS.includes(value as Action)) {
        return {
          ok: false,
          error: `Invalid action "${value}" for "${permission}" — must be allow, ask, or deny`,
        };
      }
      ruleset.push({ permission, pattern: "*", action: value as Action });
    } else if (
      typeof value === "object" &&
      value !== null &&
      !Array.isArray(value)
    ) {
      for (const [pattern, action] of Object.entries(
        value as Record<string, unknown>,
      )) {
        if (
          typeof action !== "string" ||
          !VALID_ACTIONS.includes(action as Action)
        ) {
          return {
            ok: false,
            error: `Invalid action "${String(action)}" for "${permission}" pattern "${pattern}"`,
          };
        }
        ruleset.push({ permission, pattern, action: action as Action });
      }
    } else {
      return {
        ok: false,
        error: `Invalid value for "${permission}" — must be an action string or a pattern→action object`,
      };
    }
  }

  return { ok: true, ruleset };
}
