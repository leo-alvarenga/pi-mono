import {
  MAX_STORED_OUTPUT,
  NEEDS_INPUT_MARKER,
  READ_ONLY_TOOLS,
  WRITE_TOOLS,
} from "./constants";
import type { SubagentStatus } from "./types";

const ALWAYS = "You are a transient subagent. Complete the task, then stop";
const READ_ONLY = `You may only READ and EXPLORE. Do not modify files or run mutating commands.`;
const WRITE_OK = `You may edit files ONLY if strictly necessary, preferring hash-anchored operations (replace/insert) over rewriting.`;

const QUESTIONS_SUFFIX = `If the task cannot be completed without information you cannot obtain yourself, end your final message with the exact block below and stop — do not guess:

${NEEDS_INPUT_MARKER}
- <question>

Report your findings clearly and concisely.`;

/** Dynamic minimal prompt: read-only always; write permission added only when allowed. */
export function buildSystemPrompt(allowWrite: boolean): string {
  let prompt = ALWAYS;

  if (!allowWrite) prompt += `\n\n${READ_ONLY}`;
  else prompt += `\n\n${WRITE_OK}`;

  return `${prompt}\n\n${QUESTIONS_SUFFIX}`;
}

/** Tool allowlist for the spawned child process. */
export function buildAllowlist(allowWrite: boolean): string[] {
  return allowWrite ? WRITE_TOOLS : READ_ONLY_TOOLS;
}

/**
 * Extract the questions the subagent needs answered, if it emitted the
 * NEEDS_INPUT block. Returns `[]` when the marker is present but no bullet
 * lines follow, and `undefined` when the marker is absent.
 */
export function parseNeedsInput(text: string): string[] | undefined {
  const lines = text.split("\n");
  const idx = lines.findIndex((l) => l.trim() === NEEDS_INPUT_MARKER);
  if (idx === -1) return undefined;

  const questions: string[] = [];

  for (const line of lines.slice(idx + 1)) {
    const trimmed = line.trim();

    if (trimmed.startsWith("- ")) {
      const q = trimmed.slice(2).trim();
      if (q) questions.push(q);
    } else if (trimmed === "") {
      continue;
    } else {
      break;
    }
  }

  return questions;
}

/** Classify a finished subagent run into a record status. */
export function classifyResult(opts: {
  exitCode: number;
  stopReason?: string;
  needsInput: boolean;
}): SubagentStatus {
  if (opts.needsInput) return "needs_input";

  if (
    opts.exitCode !== 0 ||
    opts.stopReason === "error" ||
    opts.stopReason === "aborted"
  ) {
    return "failed";
  }

  return "completed";
}

/** Truncate a string to a char budget, appending an ellipsis marker. */
export function truncateChars(text: string, max: number): string {
  if (text.length <= max) return text;

  return `${text.slice(0, max)}…`;
}

/** Truncate to a UTF-8 byte budget (for parallel per-task caps). */
export function truncateBytes(text: string, maxBytes: number): string {
  if (Buffer.byteLength(text, "utf8") <= maxBytes) return text;

  let out = text.slice(0, maxBytes);
  while (Buffer.byteLength(out, "utf8") > maxBytes) {
    out = out.slice(0, -1);
  }

  return `${out}\n\n[Output truncated: ${Buffer.byteLength(text, "utf8") - Buffer.byteLength(out, "utf8")} bytes omitted.]`;
}

/** Final output kept in the stored record (TUI summary only). */
export function summarizeOutput(text: string): string {
  return truncateChars(text, MAX_STORED_OUTPUT);
}
