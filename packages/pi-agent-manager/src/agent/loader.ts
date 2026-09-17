import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { parse as parseYaml } from "yaml";
import { getAgentDir } from "@earendil-works/pi-coding-agent";

import { AGENTS_DIR_NAME, AGENT_FILE_EXTENSION } from "../constants";

export function resolveAgentsDir(): string {
  return join(getAgentDir(), AGENTS_DIR_NAME);
}

export type ParsedFile =
  | { ok: true; frontmatter: Record<string, unknown>; body: string }
  | { ok: false; error: string };

export async function parseFile(filePath: string): Promise<ParsedFile> {
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

export async function readAgentFiles(
  dir: string,
): Promise<{ files: string[]; error?: string }> {
  try {
    const entries = await readdir(dir);

    return {
      files: entries.filter((f) => f.endsWith(AGENT_FILE_EXTENSION)),
    };
  } catch (err: unknown) {
    if (isENOENT(err)) return { files: [] };

    return {
      files: [],
      error: `Failed to read agents dir: ${String(err)}`,
    };
  }
}

function isENOENT(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as Record<string, unknown>).code === "ENOENT"
  );
}
