import { existsSync, readFileSync } from "node:fs";
import { readFile, readdir } from "node:fs/promises";
import { join, basename } from "node:path";
import { parse as parseYaml } from "yaml";
import { getAgentDir, type ThemeColor } from "@earendil-works/pi-coding-agent";

import {
  AGENTS_DIR_NAME,
  AGENT_FILE_EXTENSION,
  AGENT_SHORTCUT_IDS,
} from "../constants";
import type { AgentConfig, AgentType } from "./types";
import type { Action, Ruleset } from "../permission/types";
import {
  fromLegacyPermissions,
  PERMISSION_PRESETS,
} from "../permission/presets";

const VALID_ACTIONS: readonly Action[] = ["allow", "ask", "deny"];
const VALID_TYPES: readonly AgentType[] = ["primary", "subagent"];

export function resolveAgentsDir(): string {
  return join(getAgentDir(), AGENTS_DIR_NAME);
}

export function loadAgentShortcuts(): Map<string, string[]> {
  const path = join(getAgentDir(), "keybindings.json");
  const result = new Map<string, string[]>();

  if (!existsSync(path)) return result;

  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return result;
  }

  if (typeof raw !== "object" || raw === null || Array.isArray(raw))
    return result;

  for (const id of Object.values(AGENT_SHORTCUT_IDS)) {
    const value = (raw as Record<string, unknown>)[id];
    if (typeof value === "string") result.set(id, [value]);
    else if (Array.isArray(value) && value.every((e) => typeof e === "string"))
      result.set(id, value as string[]);
  }

  return result;
}

export type LoadedUserAgents = {
  agents: AgentConfig[];
  errors: string[];
};

type ParsedFile =
  | { ok: true; frontmatter: Record<string, unknown>; body: string }
  | { ok: false; error: string };

export async function loadUserAgents(): Promise<LoadedUserAgents> {
  const dir = resolveAgentsDir();

  let entries: string[];
  try {
    entries = await readdir(dir);
  } catch (err: unknown) {
    if (isENOENT(err)) return { agents: [], errors: [] };
    return {
      agents: [],
      errors: [`Failed to read agents dir: ${String(err)}`],
    };
  }

  const mdFiles = entries.filter((f) => f.endsWith(AGENT_FILE_EXTENSION));
  if (mdFiles.length === 0) return { agents: [], errors: [] };

  const agents: AgentConfig[] = [];
  const errors: string[] = [];

  for (const file of mdFiles) {
    const filePath = join(dir, file);
    const parsed = await parseFile(filePath);

    if (!parsed.ok) {
      errors.push(`${file}: ${parsed.error}`);
      continue;
    }

    const result = validateAgent(parsed.frontmatter, parsed.body, file);
    if (!result.ok) {
      errors.push(`${file}: ${result.error}`);
      continue;
    }

    agents.push(result.agent);
  }

  return { agents, errors };
}

async function parseFile(filePath: string): Promise<ParsedFile> {
  let raw: string;
  try {
    raw = await readFile(filePath, "utf8");
  } catch (err) {
    return { ok: false, error: `Cannot read file: ${String(err)}` };
  }

  // YAML frontmatter is delimited by --- lines
  const parts = raw.split(/^---$/m);
  if (parts.length < 2) {
    return { ok: false, error: "Missing YAML frontmatter (--- delimiters)" };
  }

  let frontmatter: unknown;
  try {
    frontmatter = parseYaml(parts[1]);
  } catch (err) {
    return { ok: false, error: `Invalid YAML: ${String(err)}` };
  }

  if (
    typeof frontmatter !== "object" ||
    frontmatter === null ||
    Array.isArray(frontmatter)
  ) {
    return { ok: false, error: "Frontmatter must be a YAML object" };
  }

  const body = parts.slice(2).join("---").trim();
  return {
    ok: true,
    frontmatter: frontmatter as Record<string, unknown>,
    body,
  };
}

type ValidatedAgent =
  { ok: true; agent: AgentConfig } | { ok: false; error: string };

function validateAgent(
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

function isENOENT(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as Record<string, unknown>).code === "ENOENT"
  );
}
