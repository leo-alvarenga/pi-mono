import { getAgentDir } from "@earendil-works/pi-coding-agent";
import { spawn } from "node:child_process";
import { join } from "node:path";
import { readJsonObject } from "./json";

/** `settings.json:externalEditor` -> $VISUAL -> $EDITOR -> "notepad" (win32) | "nano" */
export function resolveEditorCommand(): string {
  const settings = readJsonObject(join(getAgentDir(), "settings.json"));

  const configured = settings["externalEditor"];

  if (typeof configured === "string" && configured.trim() !== "") {
    return configured.trim();
  }

  const env = process.env["VISUAL"] || process.env["EDITOR"];
  if (env) return env;

  return process.platform === "win32" ? "notepad" : "nano";
}

/**
 * Hand the terminal to the editor for `filePath` and resolve with its exit code
 * (null when the editor could not be spawned).
 * Caller is responsible for stopping/starting the TUI first
 */
export function spawnEditor(
  command: string,
  filePath: string,
): Promise<number | null> {
  const [editor, ...args] = command.split(" ");

  return new Promise((resolve) => {
    const child = spawn(editor!, [...args, filePath], {
      stdio: "inherit",
      shell: process.platform === "win32",
    });

    child.on("error", () => resolve(null));
    child.on("close", (code) => resolve(code));
  });
}
