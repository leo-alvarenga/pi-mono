import { readFileSync } from "node:fs";

/** Read a JSON object from disk (BOM-tolerant). Missing, unreadable, or malformed input yields {}. Never throws */
export function readJsonObject(path: string): Record<string, unknown> {
  try {
    const raw = readFileSync(path, "utf8").replace(/^\uFEFF/, "");
    const parsed = JSON.parse(raw);

    if (
      parsed !== null &&
      typeof parsed === "object" &&
      !Array.isArray(parsed)
    ) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // missing, unreadable, or malformed
  }

  return {};
}
