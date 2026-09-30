import { getAgentDir } from "@earendil-works/pi-coding-agent";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { readJsonObject } from "./json";

export type UnbindResult =
  | { ok: false; reason: string }
  | { ok: true; replaced: (string | string[] | undefined)[] };

export function getKeybindingsPath(): string {
  return join(getAgentDir(), "keybindings.json");
}

export function readKeybindings(): Record<string, unknown> {
  return readJsonObject(getKeybindingsPath());
}

/** Keys currently bound to one pi action id, or undefined when unset. `[]` stays [] */
export function getBoundKeys(actionIds: string[]): (string[] | undefined)[] {
  return actionIds.map((actionId) => {
    const raw = readKeybindings()[actionId];
    if (typeof raw === "string") return [raw];

    if (Array.isArray(raw) && raw.every((v) => typeof v === "string")) {
      return raw as string[];
    }

    return undefined;
  });
}

/** Set `actionId` to [] in keybindings.json, preserving every other entry */
export function unbindAction(actionIds: string[]): UnbindResult {
  const path = getKeybindingsPath();
  let current: Record<string, unknown> = {};

  try {
    const raw = readFileSync(path, "utf8").replace(/^\uFEFF/, "");
    try {
      const parsed = JSON.parse(raw);

      if (
        parsed !== null &&
        typeof parsed === "object" &&
        !Array.isArray(parsed)
      ) {
        current = parsed as Record<string, unknown>;
      }
    } catch {
      return { ok: false, reason: "keybindings.json is not valid JSON" };
    }
  } catch (err: unknown) {
    const code = (err as { code?: string }).code;

    // ENOENT: file doesn't exist, we'll create it
    if (code !== "ENOENT") {
      return { ok: false, reason: String(err) };
    }
  }

  const replaced: (string | string[] | undefined)[] = [];

  for (const actionId of actionIds) {
    const previous = current[actionId];
    current[actionId] = [];

    replaced.push(
      typeof previous === "string"
        ? previous
        : Array.isArray(previous)
          ? (previous as string[])
          : undefined,
    );

    current[actionId] = [];
  }

  try {
    writeFileSync(path, JSON.stringify(current, null, 2) + "\n", "utf8");
  } catch (err: unknown) {
    return { ok: false, reason: String(err) };
  }

  return { ok: true, replaced };
}
