import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { getAgentDir } from "@earendil-works/pi-coding-agent";

import { AGENTS_DIR_NAME, AGENT_SHORTCUT_IDS } from "../constants";
import type { AgentConfig } from "./types";
import { resolveAgentsDir, parseFile, readAgentFiles } from "./loader";
import { validateAgent } from "./validate";

export type LoadedUserAgents = {
  agents: AgentConfig[];
  errors: string[];
};

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

  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return result;
  }

  for (const id of Object.values(AGENT_SHORTCUT_IDS)) {
    const value = (raw as Record<string, unknown>)[id];

    if (typeof value === "string") {
      result.set(id, [value]);
    } else if (
      Array.isArray(value) &&
      value.every((e) => typeof e === "string")
    ) {
      result.set(id, value as string[]);
    }
  }

  return result;
}

export async function loadUserAgents(): Promise<LoadedUserAgents> {
  const dir = resolveAgentsDir();
  const { files, error } = await readAgentFiles(dir);

  if (error) {
    return { agents: [], errors: [error] };
  }

  if (files.length === 0) return { agents: [], errors: [] };

  const agents: AgentConfig[] = [];
  const errors: string[] = [];

  for (const file of files) {
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
